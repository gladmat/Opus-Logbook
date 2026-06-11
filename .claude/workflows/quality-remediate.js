export const meta = {
  name: 'quality-remediate',
  description:
    'Apply gated remediation waves from a quality-audit findings.json onto a dedicated branch. Each wave is verified with tsc + vitest + lint before commit; failures revert. Clinical-tier fixes are NEVER auto-applied.',
  whenToUse:
    'Run AFTER quality-audit and a human has reviewed REPORT.md. Args: { date, tiers: [mechanical,logic,architectural], maxWaves, findingsPath, branch }. Never pushes; never auto-applies clinical changes.',
  phases: [
    { title: 'Setup', detail: 'read findings.json, branch, cluster by fixTier+theme, establish gate baseline' },
    { title: 'Waves', detail: 'sequential: edit → gate (tsc+vitest+lint) → commit-or-revert' },
    { title: 'Closeout', detail: 'update REPORT.md with wave results + refreshed handoff' },
  ],
}

// The Workflow harness delivers `args` as a JSON STRING here — parse defensively.
let A = args
if (typeof A === 'string') {
  try {
    A = JSON.parse(A)
  } catch (e) {
    A = {}
  }
}
A = A && typeof A === 'object' ? A : {}
const DATE = A.date || 'undated'
const TIERS = A.tiers || ['mechanical', 'logic']
const MAX_WAVES = typeof A.maxWaves === 'number' ? A.maxWaves : 99
const OUT_DIR = `.claude/audit-${DATE}`
const FINDINGS_PATH = A.findingsPath || `${OUT_DIR}/findings.json`
const BRANCH = A.branch || `quality/remediation-${DATE}`

const SETUP_SCHEMA = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    onBranch: { type: 'boolean' },
    baseline: {
      type: 'object',
      properties: {
        tscClean: { type: 'boolean' },
        testCount: { type: 'number' },
        testsPassing: { type: 'boolean' },
        lintWarnings: { type: 'number' },
      },
      required: ['tscClean', 'testCount', 'testsPassing', 'lintWarnings'],
    },
    clusters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          theme: { type: 'string' },
          fixTier: { type: 'string' },
          findingIds: { type: 'array', items: { type: 'string' } },
          files: { type: 'array', items: { type: 'string' } },
          plan: { type: 'string' },
          details: { type: 'string', description: 'the verbatim findings (title+file+fix) this cluster must address' },
        },
        required: ['id', 'title', 'fixTier', 'findingIds', 'plan', 'details'],
      },
    },
    deferred: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'title', 'reason'] },
      description: 'clinical-tier findings + tiers not selected — reported, never auto-applied',
    },
  },
  required: ['branch', 'onBranch', 'baseline', 'clusters', 'deferred'],
}

const EDIT_SCHEMA = {
  type: 'object',
  properties: {
    filesTouched: { type: 'array', items: { type: 'string' } },
    newFiles: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    appliedFindingIds: { type: 'array', items: { type: 'string' } },
    skippedFindingIds: { type: 'array', items: { type: 'string' } },
  },
  required: ['filesTouched', 'newFiles', 'summary'],
}

const GATE_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    tscClean: { type: 'boolean' },
    testCount: { type: 'number' },
    testsPassing: { type: 'boolean' },
    lintWarnings: { type: 'number' },
    lintErrors: { type: 'number' },
    failureLog: { type: 'string', description: 'the relevant error output if not passing' },
  },
  required: ['pass', 'tscClean', 'testsPassing'],
}

// ---------------------------------------------------------------------------
// Phase: Setup
// ---------------------------------------------------------------------------
phase('Setup')
log(`quality-remediate · tiers=${JSON.stringify(TIERS)} · branch=${BRANCH} · findings=${FINDINGS_PATH}`)

const setup = await agent(
  `You are preparing a gated remediation run for Opus (repo root = working dir).

1. Read \`${FINDINGS_PATH}\`. If it does not exist, return clusters:[] deferred:[] with a note in baseline (and onBranch:false).
2. Establish a clean starting tree on a dedicated branch:
   - \`git status --porcelain\` — there may be untracked audit artifacts (the ${OUT_DIR}/ dir) and untracked workflow files; that is expected.
   - Create/switch: \`git checkout -B ${BRANCH}\` (this carries untracked files over). Confirm with \`git branch --show-current\`.
   - Commit the audit artifacts so they survive any later \`git reset --hard\`: \`git add ${OUT_DIR} && git commit -m "Audit artifacts ${DATE}" --no-verify\` (only if there is something to commit). Set onBranch=true.
   - **Never operate on main.** If you cannot get onto ${BRANCH}, return onBranch:false and empty clusters.
3. Establish the gate BASELINE (read-only): run \`npm run check:types\`, \`npx vitest run 2>&1 | tail -20\`, \`npm run lint 2>&1 | tail -20\`. Record tscClean, testCount, testsPassing, lintWarnings.
4. Group the findings into remediation CLUSTERS:
   - Eligible tiers this run: ${JSON.stringify(TIERS)}. EXCLUDE every fixTier:"clinical" finding (always) and any tier not in the eligible list → put those in \`deferred\` with a reason.
   - Cluster the eligible findings by (fixTier, theme) so each cluster touches a coherent, small set of files and can be verified independently. Order clusters: mechanical first, then logic, then architectural.
   - For each cluster, \`details\` MUST contain the verbatim list of its findings (id, file:line, title, suggestedFix) so the wave agent has everything it needs without re-reading findings.json.

Return the SETUP object.`,
  { label: 'setup', phase: 'Setup', schema: SETUP_SCHEMA },
)

if (!setup || !setup.onBranch) {
  log('setup could not establish the remediation branch — aborting (no edits made)')
  return { aborted: true, reason: 'could not get onto remediation branch', branch: BRANCH }
}
log(`on ${setup.branch} · baseline tests ${setup.baseline.testCount} ${setup.baseline.testsPassing ? 'green' : 'RED'} · lint ${setup.baseline.lintWarnings} · ${setup.clusters.length} clusters · ${setup.deferred.length} deferred`)

const lintCeiling = Math.max(2, setup.baseline.lintWarnings || 0)
const testFloor = setup.baseline.testsPassing ? setup.baseline.testCount || 0 : 0

// ---------------------------------------------------------------------------
// Phase: Waves  (SEQUENTIAL — one editor on the shared tree at a time)
// ---------------------------------------------------------------------------
phase('Waves')

function gatePrompt(cluster) {
  return `Run the Opus quality gates after a remediation edit and report results. Read-only. Working dir = repo root.

Run, capturing output:
  1. \`npm run check:types\`            → tscClean if no errors
  2. \`npx vitest run 2>&1 | tail -25\`  → testCount + all passing? (must be ≥ ${testFloor})
  3. \`npm run lint 2>&1 | tail -25\`    → warning count (must be ≤ ${lintCeiling}), error count (must be 0)

pass = tscClean AND testsPassing AND testCount ≥ ${testFloor} AND lintWarnings ≤ ${lintCeiling} AND lintErrors == 0.
If not passing, put the SHORT relevant error excerpt in failureLog. (Cluster under test: ${cluster.id} — ${cluster.title}.)

Return the GATE object.`
}

async function runWave(cluster, idx) {
  log(`wave ${idx + 1}/${setup.clusters.length}: ${cluster.id} — ${cluster.title} (${cluster.fixTier})`)

  // 1. apply edits
  const edit = await agent(
    `You are fixing one cluster of verified audit findings in Opus (repo root = working dir). You ARE allowed to edit files for THIS cluster only.

RULES:
- CLAUDE.md is law. Respect every locked decision + anti-pattern. Use theme.* tokens (and the *Surface alpha tokens), parseIsoDateValue/parseDateOnlyValue for date-only fields, the secureStorage wrapper, ProcedureSuggestions, the *Ref callback-stability pattern, AcceptedMappingCard, etc. — reuse, don't reinvent.
- Minimal diffs. Touch ONLY what these findings require. Do not opportunistically refactor neighbouring code.
- After editing, run \`npx prettier --write\` on the files you changed (the repo's pre-commit expects prettier-clean).
- If a finding turns out to be wrong / risky / would violate a locked decision, SKIP it (list it in skippedFindingIds with why in summary) rather than forcing a bad change.
- Do NOT commit, do NOT run git. Just edit. Do NOT run the full test/type gate (the next step does that).

CLUSTER ${cluster.id} — ${cluster.title}  [tier: ${cluster.fixTier}]
Plan: ${cluster.plan}

Findings to fix:
${cluster.details}

Return the EDIT object (filesTouched, newFiles you created, appliedFindingIds, skippedFindingIds, summary).`,
    { label: `edit:${cluster.id}`, phase: 'Waves', schema: EDIT_SCHEMA },
  )

  if (!edit || (!edit.filesTouched.length && !edit.newFiles.length)) {
    log(`  ${cluster.id}: no edits applied (${edit ? edit.summary : 'agent returned nothing'})`)
    return { cluster: cluster.id, title: cluster.title, status: 'no-op', summary: edit ? edit.summary : 'no edits' }
  }

  // 2. gate
  let gate = await agent(gatePrompt(cluster), { label: `gate:${cluster.id}`, phase: 'Waves', schema: GATE_SCHEMA })

  // 3. one self-repair attempt if red
  if (!gate || !gate.pass) {
    log(`  ${cluster.id}: gate RED → one repair attempt`)
    const repair = await agent(
      `A remediation cluster broke the gate. Fix it so tsc is clean, tests pass (≥ ${testFloor}), and lint warnings ≤ ${lintCeiling}. Minimal changes only; you may also revert part of the prior edit if that is the cleanest fix. Do not commit. Run prettier on touched files.

Cluster: ${cluster.id} — ${cluster.title}
Files touched so far: ${JSON.stringify((edit.filesTouched || []).concat(edit.newFiles || []))}
Gate failure log:
${gate ? gate.failureLog : '(gate agent returned nothing)'}

Return the EDIT object describing what you changed.`,
      { label: `repair:${cluster.id}`, phase: 'Waves', schema: EDIT_SCHEMA },
    )
    gate = await agent(gatePrompt(cluster), { label: `regate:${cluster.id}`, phase: 'Waves', schema: GATE_SCHEMA })
    edit.filesTouched = Array.from(new Set([...(edit.filesTouched || []), ...((repair && repair.filesTouched) || [])]))
    edit.newFiles = Array.from(new Set([...(edit.newFiles || []), ...((repair && repair.newFiles) || [])]))
  }

  // 4. commit on green, revert on red
  if (gate && gate.pass) {
    const staged = Array.from(new Set([...(edit.filesTouched || []), ...(edit.newFiles || [])]))
    const commit = await agent(
      `Commit on branch ${setup.branch} for remediation cluster ${cluster.id}.
Stage ONLY this cluster's files (do NOT run \`git add -A\` — it would sweep untracked tooling/audit dirs into the commit). Run:
  \`git add -A -- ${staged.map((f) => JSON.stringify(f)).join(' ')}\`
(the \`-A\` after \`--\` still records deletions for those specific paths). Then commit with this message (keep the trailer EXACTLY):

quality: ${cluster.title}

${cluster.id} · tier ${cluster.fixTier} · ${(cluster.findingIds || []).join(', ')}

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>

Use \`git commit -m "..." -m "..." --no-verify\` (pre-commit already satisfied by prettier). Then reply with the short commit hash from \`git rev-parse --short HEAD\`. Do NOT push.`,
      { label: `commit:${cluster.id}`, phase: 'Waves' },
    )
    log(`  ${cluster.id}: ✓ committed (tests ${gate.testCount ?? '?'}, lint ${gate.lintWarnings ?? '?'})`)
    return { cluster: cluster.id, title: cluster.title, status: 'committed', tier: cluster.fixTier, findingIds: cluster.findingIds, gate, commit: String(commit).slice(0, 120) }
  }

  // revert: reset tracked files to last good commit, remove any new untracked files this wave created
  await agent(
    `Cluster ${cluster.id} failed the gate twice. REVERT it cleanly on branch ${setup.branch}:
  1. \`git reset --hard HEAD\`  (discards this wave's edits to tracked files; previous committed waves are preserved)
  2. Remove only the new untracked files this wave created: ${JSON.stringify(edit.newFiles || [])} — \`rm -f <each>\` if it exists. Do NOT touch anything else, especially not ${OUT_DIR}/.
  3. Confirm \`git status --porcelain\` is clean.
Reply "reverted".`,
    { label: `revert:${cluster.id}`, phase: 'Waves' },
  )
  log(`  ${cluster.id}: ✗ reverted (gate stayed red) → re-filed as a ticket`)
  return { cluster: cluster.id, title: cluster.title, status: 'reverted', tier: cluster.fixTier, findingIds: cluster.findingIds, failureLog: gate ? gate.failureLog : 'no gate result' }
}

const waveResults = []
const runnable = setup.clusters.slice(0, MAX_WAVES)
for (let i = 0; i < runnable.length; i++) {
  const r = await runWave(runnable[i], i)
  waveResults.push(r)
}

const committed = waveResults.filter((r) => r.status === 'committed')
const reverted = waveResults.filter((r) => r.status === 'reverted')
log(`waves done: ${committed.length} committed · ${reverted.length} reverted · ${waveResults.filter((r) => r.status === 'no-op').length} no-op`)

// ---------------------------------------------------------------------------
// Phase: Closeout
// ---------------------------------------------------------------------------
phase('Closeout')
const finalGate = await agent(
  `Final read-only gate snapshot on branch ${setup.branch}. Run \`npm run check:types\`, \`npx vitest run 2>&1 | tail -15\`, \`npm run lint 2>&1 | tail -15\`. Return the GATE object (pass = tsc clean AND tests passing ≥ ${testFloor} AND lint ≤ ${lintCeiling}).`,
  { label: 'final-gate', phase: 'Closeout', schema: GATE_SCHEMA },
)

// Subagents cannot write report/output files — so RETURN the remediation-log
// markdown and let the orchestrator append it to REPORT.md.
const closeoutMarkdown = await agent(
  `Compose (do NOT write a file — return the markdown as your reply text) a remediation-log section to append to the audit REPORT.md. Format:

## Remediation run — ${DATE} (branch \`${setup.branch}\`)

- Tiers applied: ${JSON.stringify(TIERS)}
- Final gate: tsc ${finalGate && finalGate.tscClean ? 'clean' : 'DIRTY'}, tests ${finalGate ? finalGate.testCount : '?'} ${finalGate && finalGate.testsPassing ? 'green' : 'RED'}, lint warnings ${finalGate ? finalGate.lintWarnings : '?'} (baseline was tests ${setup.baseline.testCount}, lint ${setup.baseline.lintWarnings})

Then a **per-wave table** (columns: cluster | title | tier | status [✓ committed / ✗ reverted / no-op] | commit/notes) from:
${JSON.stringify(waveResults.map((r) => ({ id: r.cluster, title: r.title, tier: r.tier, status: r.status, note: r.commit || r.failureLog || r.summary || '' })), null, 2)}

Then a **Deferred — needs a human / not in scope** list (clinical + non-selected tiers) from:
${JSON.stringify(setup.deferred, null, 2)}

Then a one-line **NEXT** (re-run quality-audit to confirm deltas, open a PR for ${setup.branch}, hand clinical items to Mateusz). Reply with ONLY the markdown.`,
  { label: 'compose-closeout', phase: 'Closeout' },
)

log(`closeout composed · branch ${setup.branch} ready for review (not pushed) · orchestrator appends log to REPORT.md`)

// The orchestrator (main loop) appends closeoutMarkdown to REPORT.md, because
// subagents cannot write report files in this environment.
return {
  branch: setup.branch,
  tiers: TIERS,
  baseline: setup.baseline,
  finalGate,
  committed: committed.map((r) => ({ id: r.cluster, title: r.title, commit: r.commit })),
  reverted: reverted.map((r) => ({ id: r.cluster, title: r.title })),
  noop: waveResults.filter((r) => r.status === 'no-op').map((r) => r.cluster),
  deferred: setup.deferred,
  reportPath: `${OUT_DIR}/REPORT.md`,
  closeoutMarkdown: closeoutMarkdown || '',
}
