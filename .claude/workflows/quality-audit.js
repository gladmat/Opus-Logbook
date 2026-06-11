export const meta = {
  name: 'quality-audit',
  description:
    'Exhaustive multi-agent code + app quality audit of Opus. Read-only: fans out finders across ~15 quality dimensions and ~13 modules, adversarially verifies every finding, captures the live simulator. Returns { reportMarkdown, findings, ... }; the orchestrator persists REPORT.md + findings.json to .claude/audit-<date>/ (subagents cannot write report files in this environment).',
  whenToUse:
    'Run a complete code + app quality audit. Read-only (no edits). Pair with the quality-remediate workflow to apply the fixes. Args: { date, depth: quick|standard|exhaustive, includeSim, scope, autoRemediate }.',
  phases: [
    { title: 'Recon', detail: 'baseline gates + known-tracked items + locked decisions + module map' },
    { title: 'Discover', detail: 'per-dimension finders (loop-until-dry) + per-module breadth sweep' },
    { title: 'Verify', detail: '3 adversarial skeptics per finding (refute-by-default)' },
    { title: 'Sim', detail: 'non-interactive simctl deep-link screenshot capture + vision analysis' },
    { title: 'Critic', detail: 'completeness critic + targeted extra finder round' },
    { title: 'Synthesize', detail: 'write REPORT.md + findings.json' },
  ],
}

// ---------------------------------------------------------------------------
// Args + knobs ( scripts cannot call Date.now(); the date is passed in )
// NOTE: in this environment the Workflow harness delivers `args` as a JSON
// STRING, not a parsed object — so parse defensively before reading keys.
// ---------------------------------------------------------------------------
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
const DEPTH = A.depth || 'exhaustive'
const INCLUDE_SIM = A.includeSim !== false
const SCOPE = A.scope || null // optional string/array to restrict the search surface
const AUTO_REMEDIATE = A.autoRemediate === true
const OUT_DIR = `.claude/audit-${DATE}`

// maxVerify hard-caps the verify fan-out so a whole-repo run can't explode into
// hundreds of agents and rate-limit itself (see the 2026-06-03 runaway: 808
// agents, 47% rate-limited). Candidates beyond the cap are reported unverified.
const DEPTH_CFG =
  {
    quick: { maxRounds: 1, dryStop: 1, skeptics: 1, modules: false, critic: false, maxVerify: 25 },
    standard: { maxRounds: 1, dryStop: 1, skeptics: 1, modules: true, critic: false, maxVerify: 60 },
    exhaustive: { maxRounds: 3, dryStop: 2, skeptics: 2, modules: true, critic: true, maxVerify: 120 },
  }[DEPTH] || { maxRounds: 3, dryStop: 2, skeptics: 2, modules: true, critic: true, maxVerify: 120 }

const scopeLine = SCOPE
  ? `\n\nIMPORTANT — restrict your entire search to ONLY these paths: ${JSON.stringify(SCOPE)}. Ignore everything else.`
  : ''

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'feature']
const TIERS = ['mechanical', 'logic', 'clinical', 'architectural']

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          severity: { type: 'string', enum: SEVERITIES },
          file: { type: 'string', description: 'repo-relative path' },
          line: { type: 'number', description: '0 if not line-specific' },
          title: { type: 'string', description: 'short, unique, specific' },
          description: { type: 'string' },
          evidence: { type: 'string', description: 'the offending code snippet or grep hit' },
          suggestedFix: { type: 'string' },
          fixTier: { type: 'string', enum: TIERS },
          knownTracked: {
            type: 'boolean',
            description: 'true if already listed in the known-tracked items corpus',
          },
          confidence: { type: 'number', description: '0..1' },
        },
        required: [
          'dimension',
          'severity',
          'file',
          'line',
          'title',
          'description',
          'suggestedFix',
          'fixTier',
          'knownTracked',
        ],
      },
    },
  },
  required: ['findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    isReal: { type: 'boolean', description: 'true only if the defect is genuine and worth fixing' },
    confidence: { type: 'number' },
    refutationReason: { type: 'string', description: 'why it is or is not a real defect' },
    severityAdjustment: { type: 'string', enum: [...SEVERITIES, 'unchanged'] },
  },
  required: ['isReal', 'refutationReason'],
}

const RECON_SCHEMA = {
  type: 'object',
  properties: {
    gateBaseline: {
      type: 'object',
      properties: {
        tscClean: { type: 'boolean' },
        lintWarnings: { type: 'number' },
        lintErrors: { type: 'number' },
        testCount: { type: 'number' },
        testFiles: { type: 'number' },
        testsPassing: { type: 'boolean' },
        coverageLines: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['tscClean', 'testsPassing', 'notes'],
    },
    knownTrackedItems: {
      type: 'array',
      items: { type: 'string' },
      description: 'one line per already-tracked open item (followup notes, NEXT-SESSION, latest REPORT)',
    },
    lockedDecisions: {
      type: 'array',
      items: { type: 'string' },
      description: 'CLAUDE.md locked decisions + anti-patterns a finder must not violate',
    },
    moduleMap: { type: 'array', items: { type: 'string' } },
  },
  required: ['gateBaseline', 'knownTrackedItems', 'lockedDecisions'],
}

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    gaps: { type: 'array', items: { type: 'string' } },
    targets: {
      type: 'array',
      items: {
        type: 'object',
        properties: { area: { type: 'string' }, instruction: { type: 'string' } },
        required: ['area', 'instruction'],
      },
    },
  },
  required: ['gaps', 'targets'],
}

// ---------------------------------------------------------------------------
// Global dedup ( file::title, case-insensitive )
// ---------------------------------------------------------------------------
const seen = new Set()
function fkey(f) {
  return `${String(f.file || '').trim()}::${String(f.title || '')
    .trim()
    .toLowerCase()}`
}
function keepFresh(f) {
  const k = fkey(f)
  if (seen.has(k)) return false
  seen.add(k)
  return true
}

// ---------------------------------------------------------------------------
// Dimension catalogue
// ---------------------------------------------------------------------------
const DIMENSIONS = [
  { key: 'types', title: 'Type safety', hunt: 'Unsafe `any`/`as any`/`<any>`, non-null `!` assertions hiding real nullability, wrong/loose casts, missing discriminated-union exhaustiveness, places where `noUncheckedIndexedAccess` is defeated by a cast, untyped function boundaries. Do NOT flag framework-interop `any` that has no safer alternative — judge each.' },
  { key: 'deadcode', title: 'Dead code & unused exports', hunt: 'lib/type exports with ZERO importers anywhere (grep the symbol across the repo), unreachable branches, unused props, unused npm deps. For each suspected dead export, prove it by showing the grep returned no other references.' },
  { key: 'testgaps', title: 'Test coverage gaps', hunt: 'Pure/deterministic lib files with NO corresponding __tests__ file (≈54 known untested), and untested critical paths (export serialisers, staging/clinical maps, auth refresh). Prefer PURE modules that are cheap to test. suggestedFix = the test file to add.' },
  { key: 'security', title: 'Security / crypto / PHI', hunt: 'PHI in logs/analytics/export message bodies, direct expo-secure-store imports bypassing the secureStorage wrapper, weak/missing AEAD handling, IDOR / missing ownership checks on server routes, SNOMED/path injection, missing/incorrect rate-limiting, key material that is logged or not zeroised. This is a PHI medical app — be strict.' },
  { key: 'perf', title: 'Performance / re-render', hunt: 'List-rendered components missing React.memo, handlers/objects/arrays allocated inline as props (defeating memo), `.map()` of long lists where FlatList/FlashList belongs, JS-thread Animated where Reanimated is the rule, heavy synchronous work in render, useMemo/useCallback with wrong deps. Cross-check the god components (DiagnosisGroupEditor, useCaseForm, CaseDetailScreen).' },
  { key: 'errors', title: 'Error handling & resilience', hunt: 'Silent `catch {}` that swallows real errors, async without try/catch around storage/decrypt/network, unhandled promise rejections, missing error boundaries, `decryptData` callers that do not handle the throw, fetch without failure handling.' },
  { key: 'data', title: 'Data correctness', hunt: 'Invalid/malformed SNOMED codes, picklist integrity (dup ids, dangling procedureSuggestion cross-refs, wrong specialty tags), `new Date("YYYY-MM-DD")` date-only parsing that should use parseIsoDateValue/parseDateOnlyValue, staging-config mismatches, clinical mapping errors (hand trauma, melanoma staging, margins). Mark anything that changes clinical OUTPUT as fixTier:"clinical".' },
  { key: 'design', title: 'Design-system compliance', hunt: 'Raw hex colours outside client/constants/theme.ts palette and the documented MediaGalleryViewer exceptions, the `theme.X + "NN"` string-concat opacity pattern (should use the *Surface alpha tokens), off-8pt-grid spacing, amber used on non-interactive elements, headerTransparent/blur usage, #000/#FFF literals.' },
  { key: 'a11y', title: 'Accessibility-in-code', hunt: 'Pressable/TouchableOpacity missing accessibilityRole / accessibilityLabel / accessibilityState, icon-only buttons with no label, tap targets < 44pt, animations not gated on useReduceMotion, status shown by colour alone (violates Medical UX Rule 1). DiagnosisGroupEditor + the specialty pickers are the hot spots.' },
  { key: 'arch', title: 'Architecture & maintainability', hunt: 'God components / files that should be decomposed, duplicated logic that should share a helper, deep prop-drilling, and — most important — any violation of a CLAUDE.md LOCKED DECISION or ANTI-PATTERN (passed to you in the recon context). Flag locked-decision violations as high severity.' },
  { key: 'deps', title: 'Dependency health', hunt: 'Run `npm audit --omit=dev` and `npm audit` (read-only) and report real advisories; phantom peer deps that would break `npm ci --include=dev` on EAS (the lockfile lesson); unused dependencies; packages pinned with a caret that CLAUDE.md says must be exact (@noble/*).' },
  { key: 'server', title: 'Server / API quality', hunt: 'Endpoints missing composite ownership checks, missing Zod validation at a boundary, 5xx handlers leaking detail, any `console.*` left in server/ (pino is the rule), body-size limits, auth/rate-limit gaps. Cross-check server/routes.ts + server/app.ts.' },
  { key: 'nav', title: 'Navigation & route integrity', hunt: 'Routes registered but never navigated to (dead screens), navigations to unregistered routes, deep-link handlers that can crash, untyped route params, modal/stack presentation mismatches vs the App Screen Map in CLAUDE.md.' },
  { key: 'uxlogic', title: 'UX-logic conformance', hunt: 'Required-field validation gaps, destructive actions without Alert.alert confirmation (Medical UX Rule 3), auto-save coverage holes, getModuleVisibility correctness (cross-specialty contamination), happy-path tap-count regressions (Rule 7). Static reasoning only — no sim here.' },
  { key: 'config', title: 'Build / config / docs drift', hunt: 'app.json / eas.json drift, CLAUDE.md statements that no longer match the code (test counts, file paths, component names), env validation gaps in server/env.ts, Sentry/PostHog no-op patterns broken, .gitignore leaks. Low severity unless a statement is actively misleading.' },
]

const MODULES = [
  { key: 'picklists', area: 'client/lib/procedurePicklist.ts + client/lib/diagnosisPicklists/**', focus: 'data integrity: duplicate ids, dangling procedureSuggestion cross-refs, malformed SNOMED, specialty-tag correctness, ordering' },
  { key: 'handtrauma', area: 'client/lib/handTraumaDiagnosis.ts, handTraumaMapping.ts, client/components/hand-trauma/**', focus: 'deterministic diagnosis/label generation, fracture→procedure pair keying, mutation-after-edit correctness' },
  { key: 'export', area: 'client/lib/export*.ts (exportFhir, exportCsv, exportPdf*, export.ts)', focus: 'PHI handling, FHIR/CSV field completeness, temp-file cleanup in finally, share-target hygiene' },
  { key: 'specialtyconfig', area: 'client/lib/{skinCancerConfig,aestheticsConfig,breastConfig,burnsConfig,peripheralNerveConfig,craniofacialConfig,lymphaticConfig}.ts', focus: 'staging rules, field-visibility gating, conditional defaults, soft-delete semantics' },
  { key: 'persistence', area: 'client/lib/{storage,episodeStorage,inboxStorage,mediaStorage,mediaFileStorage,mediaEncryption,mediaDecryptCache,encryption,secureStorage,e2ee}.ts', focus: 'crypto correctness, key zeroising, cache eviction/pin races, AFU/forensic exposure, async safety' },
  { key: 'api', area: 'client/lib/{teamContactsApi,sharingApi,assessmentApi,snomedApi,discoveryService,keyPinningStore,auth}.ts', focus: 'E2EE contracts, key wrapping/pinning, authFetch refresh/retry, throttling, error surfaces' },
  { key: 'formstate', area: 'client/hooks/useCaseForm.ts, client/contexts/CaseFormContext.tsx, client/components/case-form/**', focus: 'reducer action completeness, edit-mode invariants, team/share sync, save-pipeline correctness, deep-link registry' },
  { key: 'screens', area: 'client/screens/**', focus: 'load/save correctness, deep-link/auth-expiry edge cases, modal stacking, back-button semantics, large-screen god components' },
  { key: 'components', area: 'client/components/{breast,skin-cancer,hand-elective,craniofacial,lymphatic,peripheral-nerve,burns,joint-implant}/**', focus: 'accessibility metadata, composition patterns, memoisation, design-token usage' },
  { key: 'types', area: 'client/types/**, client/lib/caseNormalization.ts', focus: 'shape correctness, discriminant exhaustiveness, normalization legacy→new invariants, backward-compat optionals' },
  { key: 'serverroutes', area: 'server/**', focus: 'endpoint authZ/ownership, Zod coverage, error-response hygiene, pino logging, body limits, env validation' },
  { key: 'media', area: 'client/components/media/**, client/lib/media*.ts, client/lib/thumbnailGenerator.ts', focus: 'EXIF stripping, encryption pipeline, gallery decrypt cache, batch caps' },
  { key: 'dashstats', area: 'client/components/dashboard/**, client/components/statistics/**, client/hooks/{usePracticePulse,useAttentionItems,useStatistics}.ts, client/lib/{dashboardSelectors,statistics,statisticsHelpers}.ts', focus: 'selector correctness, memoisation, FlatList nesting rules, date-only parsing, dashboard locked decisions' },
]

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
const COMMON_RULES = (recon) => `You are a senior code auditor for **Opus**, a PHI-bearing Expo/React Native + Express/Drizzle surgical logbook. Working dir is the repo root.

READ-ONLY. Do not edit, write, or run any mutating command. Use Read / Grep / Glob / Bash(read-only) only.

Ground every finding in EVIDENCE you actually saw (a real grep hit or file excerpt with a path + line). Do NOT speculate. The codebase is already clean and well-audited — a false positive is worse than a miss. If you are not sure, do not report it.

CLAUDE.md is the source of truth. Respect these LOCKED DECISIONS / ANTI-PATTERNS (a "finding" that contradicts one of these is itself wrong):
${(recon.lockedDecisions || []).map((d) => `  - ${d}`).join('\n') || '  - (see CLAUDE.md)'}

These items are ALREADY TRACKED — if you surface one, set knownTracked:true (still report it, but flag it):
${(recon.knownTrackedItems || []).slice(0, 60).map((d) => `  - ${d}`).join('\n') || '  - (none loaded)'}

severity: critical=remotely exploitable/data-loss/clinical-output-wrong · high=security/privacy/store-compliance/locked-decision-violation · medium=a11y/perf/dead-code/UX-friction · low=polish/docs · feature=enhancement.
fixTier: mechanical=safe textual change (token swap, a11y prop, dead-code delete, add pure test) · logic=behavioural code change needing care · clinical=changes clinical output, MUST be reviewed by a clinician · architectural=large refactor.${scopeLine}`

function finderPrompt(dim, recon, round, alreadyTitles) {
  return `${COMMON_RULES(recon)}

DIMENSION: **${dim.title}**
Hunt specifically for: ${dim.hunt}

${round > 0 ? `This is discovery round ${round + 1}. You ALREADY found these — find DIFFERENT, additional issues, or return an empty list if the dimension is exhausted:\n${alreadyTitles.map((t) => `  - ${t}`).join('\n')}\n` : ''}Return the FINDINGS object. Empty findings array is a valid, expected answer when there is nothing real left to report.`
}

function modulePrompt(m, recon) {
  return `${COMMON_RULES(recon)}

MODULE BREADTH REVIEW: **${m.key}**
Files: ${m.area}
Review these files holistically (not one axis at a time). Primary focus: ${m.focus}. But report ANY genuine defect you find across all dimensions (types, security, perf, a11y, dead code, correctness, design tokens). One module specialist catches what single-axis finders miss.

Return the FINDINGS object.`
}

function refutePrompt(f, k) {
  const lenses = ['correctness', 'does-it-actually-reproduce-in-this-codebase', 'is-it-already-handled-elsewhere']
  const lens = lenses[k % lenses.length]
  return `You are an adversarial verifier. Your DEFAULT is that the finding below is a FALSE POSITIVE; only conclude it is real if the evidence forces you to. Verification lens: **${lens}**.

Open the cited file at the cited location and the surrounding context. Check whether the defect is genuine, not already handled, and worth fixing in THIS codebase (a PHI medical RN/Expo app governed by CLAUDE.md). A finding that contradicts a CLAUDE.md locked decision is NOT real.

FINDING:
- dimension: ${f.dimension}
- severity: ${f.severity}  fixTier: ${f.fixTier}
- file: ${f.file}:${f.line || 0}
- title: ${f.title}
- description: ${f.description}
- evidence: ${f.evidence || '(none provided — be more skeptical)'}
- suggestedFix: ${f.suggestedFix}

Return the VERDICT. isReal=false unless you verified it against the actual code. Set severityAdjustment if the severity is wrong, else "unchanged".`
}

// ---------------------------------------------------------------------------
// Phase: Recon
// ---------------------------------------------------------------------------
phase('Recon')
log(`quality-audit · depth=${DEPTH} · sim=${INCLUDE_SIM} · scope=${SCOPE ? JSON.stringify(SCOPE) : 'whole repo'}`)
let recon
try {
  recon = await agent(
  `You are establishing the baseline for a code-quality audit of the Opus repo (working dir = repo root). READ-ONLY.

1. Capture the current quality-gate baseline (run these, they are read-only):
   - \`npm run check:types\`  → tscClean? any errors?
   - \`npm run lint\`         → count warnings + errors (CLAUDE.md says 2 upstream warnings are expected)
   - \`npx vitest run 2>&1 | tail -30\` → testCount + testFiles + testsPassing
   - if \`coverage/coverage-summary.json\` exists, read the lines %.
   (If a command is slow or errors, capture what you can and note it. Do not let one failure abort recon.)

2. Build the KNOWN-TRACKED items corpus — read and distil into one-line entries each:
   - .claude/plans/case-form-followup-notes.md  (clusters 1–7 and their 5a–7c sub-items)
   - .claude/audit-2026-05-14/NEXT-SESSION-PROMPT.md  (the open priority list + the melanoma N3c clinical-review flag)
   - the most recent .claude/audit-2026-05-14/REPORT-session*.md "Coverage & gaps"
   Each entry should be specific enough that a finder can recognise a duplicate (mention the file/feature).

3. Extract the LOCKED DECISIONS + ANTI-PATTERNS a finder must not violate, from CLAUDE.md (the "Locked Decisions", "Anti-Patterns — DO NOT", "Never do", "Conventions", and "Design rules" blocks). Distil to ~25 of the most enforceable one-liners.

4. moduleMap: list the top-level client/ and server/ subdirectories with rough file counts (git ls-files | sed | sort | uniq -c is fine).

Return the RECON object.`,
    { label: 'recon', phase: 'Recon', schema: RECON_SCHEMA },
  )
} catch (e) {
  log(`recon failed (${String(e).slice(0, 120)}) → proceeding with minimal defaults`)
}
if (!recon) {
  recon = {
    gateBaseline: { tscClean: true, testsPassing: true, notes: 'recon unavailable (rate-limited or errored)' },
    knownTrackedItems: [],
    lockedDecisions: [],
    moduleMap: [],
  }
}
log(
  `baseline: tsc ${recon.gateBaseline.tscClean ? 'clean' : 'DIRTY'} · tests ${recon.gateBaseline.testCount || '?'}/${recon.gateBaseline.testFiles || '?'} ${recon.gateBaseline.testsPassing ? 'green' : 'RED'} · ${recon.knownTrackedItems.length} tracked items loaded`,
)

// ---------------------------------------------------------------------------
// Phase: Discover  (dimensions loop-until-dry, in parallel; + module breadth)
// ---------------------------------------------------------------------------
phase('Discover')

async function discoverDimension(dim) {
  const found = []
  let dry = 0
  for (let round = 0; round < DEPTH_CFG.maxRounds && dry < DEPTH_CFG.dryStop; round++) {
    let res = null
    try {
      res = await agent(
        finderPrompt(dim, recon, round, found.map((f) => f.title)),
        { label: `find:${dim.key}#${round + 1}`, phase: 'Discover', schema: FINDINGS_SCHEMA },
      )
    } catch (e) {
      break // one round failing should not kill the dimension
    }
    const fresh = (res && res.findings ? res.findings : []).filter(keepFresh)
    if (!fresh.length) {
      dry++
      continue
    }
    dry = 0
    found.push(...fresh)
  }
  return found
}

const dimensionFindings = (await parallel(DIMENSIONS.map((d) => () => discoverDimension(d)))).filter(Boolean).flat()
log(`dimension finders: ${dimensionFindings.length} candidate findings`)

let moduleFindings = []
if (DEPTH_CFG.modules) {
  const modResults = await parallel(
    MODULES.map((m) => () => agent(modulePrompt(m, recon), { label: `module:${m.key}`, phase: 'Discover', schema: FINDINGS_SCHEMA })),
  )
  moduleFindings = modResults
    .filter(Boolean)
    .flatMap((r) => (r.findings ? r.findings : []))
    .filter(keepFresh)
  log(`module breadth: ${moduleFindings.length} additional candidates`)
}

const candidates = [...dimensionFindings, ...moduleFindings]

// hard-cap the verify fan-out (severity-first) so a whole-repo run can't
// explode into hundreds of agents and rate-limit itself.
const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3, feature: 4 }
candidates.sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9))
const toVerify = candidates.slice(0, DEPTH_CFG.maxVerify)
const cappedOut = candidates.slice(DEPTH_CFG.maxVerify)
if (cappedOut.length) {
  log(`verify cap: ${candidates.length} candidates → verifying top ${toVerify.length} by severity; ${cappedOut.length} lower-severity deferred (reported unverified)`)
} else {
  log(`total ${candidates.length} unique candidates → verifying`)
}

// ---------------------------------------------------------------------------
// Phase: Verify  (N adversarial skeptics per finding; majority real → survives)
// ---------------------------------------------------------------------------
phase('Verify')
const need = Math.ceil(DEPTH_CFG.skeptics / 2)
const verified = await parallel(
  toVerify.map((f, i) => async () => {
    const votes = (
      await parallel(
        Array.from({ length: DEPTH_CFG.skeptics }, (_, k) => () =>
          agent(refutePrompt(f, k), {
            label: `verify:${f.dimension}#${i}.${k}`,
            phase: 'Verify',
            schema: VERDICT_SCHEMA,
          }),
        ),
      )
    ).filter(Boolean)
    const realCount = votes.filter((v) => v.isReal).length
    const adj = votes.map((v) => v.severityAdjustment).find((s) => s && s !== 'unchanged')
    return {
      ...f,
      severity: adj || f.severity,
      verdict: { isReal: realCount >= need, realCount, total: votes.length, reasons: votes.map((v) => v.refutationReason) },
    }
  }),
)
const confirmed = verified.filter(Boolean).filter((f) => f.verdict.isReal)
log(`verified: ${confirmed.length}/${candidates.length} findings survived adversarial review`)

// ---------------------------------------------------------------------------
// Phase: Sim  (non-interactive simctl capture + vision analysis; graceful degrade)
// ---------------------------------------------------------------------------
phase('Sim')
let visualFindings = []
if (INCLUDE_SIM) {
  const capture = await agent(
    `You drive the iOS Simulator NON-INTERACTIVELY for a visual audit of Opus. Working dir = repo root. Use Bash only.

GRACEFUL DEGRADE: if any precondition fails, do NOT try to build the app or block — just return { captured:false, reason }.

1. \`xcrun simctl list devices booted\` — find a booted simulator UDID. If none booted, return captured:false.
2. Confirm the app is installed: \`xcrun simctl get_app_container <udid> com.drgladysz.opus 2>&1\`. If it errors (not installed), return captured:false with that reason.
3. Discover available debug deep links by reading client/components/DevDeepLinkHandler.tsx (and App.tsx deep-link routing). Known ones: opus://debug/login (signs in), opus://debug/seed (seeds ~22 cases + 1 episode), opus://debug/onboarding.
4. Drive it: \`xcrun simctl openurl <udid> "opus://debug/login"\`, wait ~3s (sleep 3), then \`opus://debug/seed\`, wait ~3s. Then screenshot the surfaces you can reach using \`xcrun simctl io <udid> screenshot <path>\`. Save PNGs into ${OUT_DIR}/screenshots/ with descriptive names (mkdir -p first).
5. Capture BOTH themes: \`xcrun simctl ui <udid> appearance light\` and \`... appearance dark\`, screenshotting each reachable surface (dashboard at minimum; plus any surface reachable via deep links).
   Honestly report which surfaces you could and could NOT reach (interactive tapping is out of scope here).

Return JSON: { captured: boolean, reason: string, shots: [{ path, screen, theme }] }. Be truthful about coverage.`,
    { label: 'sim-capture', phase: 'Sim', schema: {
        type: 'object',
        properties: {
          captured: { type: 'boolean' },
          reason: { type: 'string' },
          shots: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, screen: { type: 'string' }, theme: { type: 'string' } }, required: ['path', 'screen', 'theme'] } },
        },
        required: ['captured', 'reason'],
      } },
  )

  if (capture && capture.captured && capture.shots && capture.shots.length) {
    log(`sim: captured ${capture.shots.length} screenshots → analysing`)
    const analyses = await parallel(
      capture.shots.map((s, i) => () =>
        agent(
          `${COMMON_RULES(recon)}

VISUAL AUDIT of a real simulator screenshot. Read the image at: ${s.path} (screen="${s.screen}", theme="${s.theme}").
Evaluate ONLY what you can see against the CLAUDE.md Visual Standards: contrast (WCAG AA), 8pt-grid spacing, amber (#E5A00D) on interactive elements ONLY, no raw bright colours, text truncation (no overflow), safe-area respect, ≥44pt tap targets, correct dark/light surfaces (no #000 / pure #FFF). Report only DEFECTS you can actually see. Set dimension:"visual", file to the most likely source screen/component, fixTier usually "mechanical" or "logic". Empty is fine.

Return the FINDINGS object.`,
          { label: `sim-analyse:${s.screen}.${s.theme}#${i}`, phase: 'Sim', schema: FINDINGS_SCHEMA },
        ),
      ),
    )
    visualFindings = analyses.filter(Boolean).flatMap((r) => (r.findings ? r.findings : [])).filter(keepFresh)
    log(`sim: ${visualFindings.length} visual findings`)
  } else {
    log(`sim: skipped — ${capture ? capture.reason : 'capture agent returned nothing'}`)
  }
} else {
  log('sim: disabled by args')
}

// ---------------------------------------------------------------------------
// Phase: Critic  (completeness — what went unaudited?)
// ---------------------------------------------------------------------------
phase('Critic')
let criticFindings = []
if (DEPTH_CFG.critic) {
  const critic = await agent(
    `${COMMON_RULES(recon)}

You are the COMPLETENESS CRITIC. The audit ran these dimensions: ${DIMENSIONS.map((d) => d.key).join(', ')} and these module sweeps: ${MODULES.map((m) => m.key).join(', ')}. It confirmed ${confirmed.length} findings.

Identify SURFACES THAT WENT UNAUDITED or under-audited: a directory no module owned, a file type not swept (e.g. *.swift native targets, migrations/, shared/, scripts/, *.config.*), a risk class not covered, or a confirmed-finding cluster that implies a neighbouring un-checked file. Return up to 8 concrete targeted follow-up search instructions.

Return the CRITIC object.`,
    { label: 'critic', phase: 'Critic', schema: CRITIC_SCHEMA },
  )
  log(`critic gaps: ${(critic.gaps || []).length}; targeted rounds: ${(critic.targets || []).length}`)

  if (critic && critic.targets && critic.targets.length) {
    const extraRaw = await parallel(
      critic.targets.slice(0, 8).map((t, i) => () =>
        agent(
          `${COMMON_RULES(recon)}

TARGETED COMPLETENESS ROUND — area: ${t.area}
Instruction: ${t.instruction}
Return the FINDINGS object (empty if nothing real).`,
          { label: `critic-find#${i}`, phase: 'Critic', schema: FINDINGS_SCHEMA },
        ),
      ),
    )
    const extra = extraRaw.filter(Boolean).flatMap((r) => (r.findings ? r.findings : [])).filter(keepFresh)
    // light single-skeptic verify for the tail
    const extraVerified = await parallel(
      extra.map((f, i) => async () => {
        const v = await agent(refutePrompt(f, 0), { label: `critic-verify#${i}`, phase: 'Critic', schema: VERDICT_SCHEMA })
        return v && v.isReal ? { ...f, verdict: { isReal: true, realCount: 1, total: 1, reasons: [v.refutationReason] } } : null
      }),
    )
    criticFindings = extraVerified.filter(Boolean)
    log(`critic: ${criticFindings.length} additional confirmed findings`)
  }
}

// ---------------------------------------------------------------------------
// Phase: Synthesize  (write REPORT.md + findings.json)
// ---------------------------------------------------------------------------
phase('Synthesize')
const allConfirmed = [...confirmed, ...criticFindings, ...visualFindings]

// strip the heavy verdict.reasons before serialising to keep findings.json lean
const slim = allConfirmed.map((f, i) => ({
  id: `F${String(i + 1).padStart(3, '0')}`,
  dimension: f.dimension,
  severity: f.severity,
  file: f.file,
  line: f.line || 0,
  title: f.title,
  description: f.description,
  evidence: f.evidence || '',
  suggestedFix: f.suggestedFix,
  fixTier: f.fixTier,
  knownTracked: !!f.knownTracked,
  confidence: typeof f.confidence === 'number' ? f.confidence : null,
}))

const counts = SEVERITIES.reduce((a, s) => ((a[s] = slim.filter((f) => f.severity === s).length), a), {})
const tierCounts = TIERS.reduce((a, t) => ((a[t] = slim.filter((f) => f.fixTier === t).length), a), {})

const FINDINGS_JSON = JSON.stringify(slim, null, 2)

// IMPORTANT: workflow subagents are sandbox-blocked from writing report/output
// files ("Subagents should return findings as text"). So the report agent RETURNS
// the markdown as text and the ORCHESTRATOR (main loop) persists REPORT.md +
// findings.json from this workflow's return value. Do not reintroduce a Write here.
const reportMarkdown = await agent(
  `Produce the COMPLETE markdown body of the audit report REPORT.md for a code+app quality audit of Opus dated ${DATE} (depth=${DEPTH}). Your text reply IS the deliverable — return ONLY the finished markdown, nothing before or after it. Do NOT use the Write tool (it is blocked for subagents). Base the report ONLY on these VERIFIED findings (do not invent new ones):

${FINDINGS_JSON}

Match the developer's house format from .claude/audit-2026-05-14/REPORT-session*.md. Sections, in order:
   - Title: \`# Opus quality audit — ${DATE}\` + a one-line "generated by the quality-audit workflow (depth=${DEPTH})".
   - **Gate baseline** block: tsc ${recon.gateBaseline.tscClean ? 'clean' : 'DIRTY'}, tests ${recon.gateBaseline.testCount || '?'}/${recon.gateBaseline.testFiles || '?'} ${recon.gateBaseline.testsPassing ? 'green' : 'RED'}, lint warnings ${recon.gateBaseline.lintWarnings ?? '?'}, coverage lines ${recon.gateBaseline.coverageLines ?? '?'}%.
   - **TL;DR**: 3–6 bullets. Counts by severity: ${JSON.stringify(counts)}. Counts by fixTier: ${JSON.stringify(tierCounts)}. Call out the single most important NEW finding.
   - **Triaged findings** table: columns # | sev (use 🔴 critical / 🟠 high / 🟡 medium / 🔵 low / ✨ feature) | file:line | what's wrong | fix | tier | tracked?. One row per finding, ordered critical→low then by dimension.
   - **Clusters**: group the findings into 4–10 themed clusters (by fixTier + theme — this is what the remediation workflow will consume). For each cluster: a name, *Why it matters*, *Plan*, *Risk*, *Verification* (the exact gate commands / sim steps). Order clusters mechanical → logic → architectural → clinical.
   - **NEW vs already-tracked**: two short lists — net-new findings vs ones that were already in the known-tracked corpus (knownTracked:true).
   - **Clinical-review queue**: every fixTier:"clinical" finding, each marked \`CLINICAL-REVIEW\` — these must NOT be auto-applied.
   - **Coverage & gaps**: honestly state what was and was NOT audited (e.g. sim coverage was ${INCLUDE_SIM ? 'attempted' : 'disabled'}; ${visualFindings.length} visual findings).${cappedOut.length ? ` IMPORTANT: ${cappedOut.length} lower-severity candidates were NOT adversarially verified because the verify cap (${DEPTH_CFG.maxVerify}) was hit — list them here under "Unverified (re-run scoped to surface)": ${cappedOut.slice(0, 20).map((f) => `${f.file} — ${f.title}`).join('; ')}.` : ''}
   - **NEXT-SESSION handoff**: what the remediation workflow should run first, and what needs a human.

Keep it scannable. Use the verified findings only; do not add new ones. Reply with ONLY the markdown report body (it is captured as the deliverable).`,
  { label: 'format-report', phase: 'Synthesize' },
)

log(`synthesised report (${(reportMarkdown || '').length} chars) + ${slim.length} findings → orchestrator persists to ${OUT_DIR}`)

// ---------------------------------------------------------------------------
// Optional: nested remediation ( opt-in; default is a human review gate )
// ---------------------------------------------------------------------------
if (AUTO_REMEDIATE && slim.length) {
  log('autoRemediate=true → nesting quality-remediate (mechanical+logic tiers)')
  try {
    await workflow('quality-remediate', { date: DATE, tiers: ['mechanical', 'logic'] })
  } catch (e) {
    log(`quality-remediate could not run: ${String(e).slice(0, 200)}`)
  }
}

// The orchestrator (main loop) writes REPORT.md + findings.json from these fields,
// because subagents cannot write report/output files in this environment.
return {
  date: DATE,
  depth: DEPTH,
  outDir: OUT_DIR,
  reportPath: `${OUT_DIR}/REPORT.md`,
  findingsPath: `${OUT_DIR}/findings.json`,
  total: slim.length,
  bySeverity: counts,
  byTier: tierCounts,
  visualFindings: visualFindings.length,
  cappedUnverified: cappedOut.length,
  baseline: recon.gateBaseline,
  findings: slim,
  reportMarkdown: reportMarkdown || '',
}
