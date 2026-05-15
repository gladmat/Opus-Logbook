# Next-session prompt — Opus audit, session 6 (overnight autonomous)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. **Designed to run
> autonomously through the night** — work the priority list top-down,
> commit after every cluster, stop cleanly between clusters when context
> gets tight. Session 6 front-loads source-level work that doesn't need
> the simulator (because unattended sim runs are fragile); sim-dependent
> clusters are at the END so they only run if the source-level work
> finishes early AND the sim is healthy.

---

You are continuing a multi-session visual + functional audit of **Opus**,
a full-stack Expo/React Native surgical logbook. Sessions 1–5 (2026-05-14/15)
cleared all the source-level audit findings:
- 40-screen visual sweep + 11 specialty modules + populated data surfaces +
  light-theme sweep + iPhone SE 3 (sessions 1–3)
- Dead routes deleted, testID + a11y backlog, raw-hex round 1, case-form
  Pressable a11y, HeadNeck React.memo (session 4)
- Server BCRL/post-melanoma TNM-vs-ISL staging fix, vestigial PlanCase
  cleanup, React.memo perf audit (DiagnosisPicker / HandElectivePicker /
  ProcedureSubcategoryPicker), all 19 react-hooks/exhaustive-deps closed,
  18 import-duplicates closed, 29 array-types closed, 82 of 83 unused-vars
  closed, raw-hex round 2 with new theme.pathology / .burnDepth /
  .nerveSeverity tokens (session 5)

**Current lint state:** 3 warnings remain across the entire codebase
(`handleMultiDigitConfirm` half-shipped feature flagged for Mateusz, plus
2 `import/no-named-as-default` from npm packages we can't fix). **Tests:**
1541/1541. **`tsc --noEmit`:** clean.

Session 6 is the FOLLOW-UP pass — verify session 5 didn't break anything,
attack the remaining raw-hex pile, find perf gaps the original brief
missed, and (if time permits) on-device verification + Maestro flows.

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session5.md` — most recent. Its
   "Findings — triaged" + "Coverage & gaps" sections list what's left.
2. `.claude/audit-2026-05-14/REPORT-session4.md`
3. `.claude/audit-2026-05-14/REPORT-session3.md` — has the "Tooling
   notes" with Maestro 2.5.1 kAXError workarounds. Read before driving
   the sim.
4. `.claude/audit-2026-05-14/REPORT-session2.md` + `REPORT.md`
5. `CLAUDE.md` → "AI Testing & Visual Quality Standards" + "Design
   Quality & Aesthetics".
6. Auto-loaded memory: `project_mac_dev_env.md`,
   `project_opus_visual_audit.md`, `feedback_testing_delegation.md`.

## ENVIRONMENT BRING-UP — verify but don't depend on it

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH=$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
```

**Source-level clusters (1–6) don't need the sim or API server.** They
run on:
- `npm run check:types` (must stay clean)
- `npx vitest run` (must stay green; can add tests)
- `npm run lint` (warning count must not increase)

For the optional sim-dependent clusters (7–9): iPhone 17 sim UDID
`6AF34D12-7A59-439E-A861-768C5578B00A`, iOS 26.4. Verify before
attempting: `xcrun simctl list devices | grep 6AF34D12`. If the sim
isn't booted or the app isn't installed, **skip clusters 7–9** and
spend the remaining time on cluster 6 or write a follow-up audit
document. Don't burn an hour trying to revive the sim unattended.

## THE TASK — priority order

Write any new screenshots to `.claude/audit-2026-05-14/screenshots/`,
findings to a new `.claude/audit-2026-05-14/REPORT-session6.md`. **Work
the list top-down**; each cluster is independently committable. Stop
cleanly between clusters if you hit context limits.

---

### 1. **Session 5 commit self-review** (~30 min, source-level)

The fastest way to catch any damage session 5 caused: read each commit
with fresh eyes and verify it does what the message claims.

Walk these 7 commits in order:

```bash
git log --oneline 6839909..a7b2fa1
```

For each, `git show <sha>` and check:

- **`5706471` BCRL fix** — confirm the added SNOMED codes match what
  the client diagnosis picklist actually uses. Cross-reference
  `client/lib/diagnosisPicklists/lymphoedemaDiagnoses.ts` snomedCtCode
  values against the ISL config's snomedCtCodes array. Any codes used
  by the client that AREN'T in the ISL list are still broken.
- **`513bc18` PlanCase cleanup** — grep for any indirect callers of
  `getPlannedCases` or `getPlannedCaseCount` I might have missed
  (re-exports, dynamic imports, etc).
- **`d5e2796` memoize pickers** — re-read each call site and verify
  the `onSelect` / `onChange` props really are `useCallback`-wrapped.
  Session 5 audited these but the bar was "useCallback exists at the
  call site"; the better bar is "all deps in that useCallback are
  stable". Check for `useCallback` calls whose deps include unstable
  values (e.g. `[procedure]` where procedure changes per keystroke).
- **`a87f7e4` exhaustive-deps** — verify the deletions of array-index
  expressions from HandTraumaAssessment's useMemo deps are truly
  redundant. Pick one and write a test that fails if you re-add an
  index-mutation without changing the array reference.
- **`bced1b3` array-type cleanup** — spot-check that no `eslint-disable`
  comments got incorrectly stripped along with the `Array<T>` →
  `T[]` rewrites.
- **`5476b98` unused-vars** — re-grep for each deleted identifier across
  the whole codebase (including server/, shared/, tests). If anything
  pops up, that's a real regression — re-add the import.
- **`0dc0bf5` raw-hex round 2** — visually trace each migrated colour
  to confirm the new theme token resolves to a clinically-equivalent
  shade. The PATHOLOGY_OPTIONS migration is the highest-risk because
  the chip selected-state derives from `theme.pathology[opt.colorKey]`
  at render time — confirm shallow re-render doesn't blow up.

If you find anything, fix it inline and document in REPORT-session6.md.
If everything's clean, document "self-review clean — no regressions"
and move on.

---

### 2. **Raw-hex round 3 — finish the remaining 132 instances** (~1.5 hours, source-level)

After round 2 (session 5 commit `0dc0bf5`), `client/` still has 132
raw-hex literals. Many are intentional (always-black camera viewfinder
overlays, charcoal palette references), but a triage will surface the
ones that should migrate to existing or new theme tokens.

**Method:** Walk the file list with this command:

```bash
grep -rnE "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b" /Users/mateusz/projects-local/Opus_Logbook/client \
  --include="*.tsx" --include="*.ts" | \
  grep -v __tests__ | grep -v constants/theme.ts | \
  awk -F: '{print $1}' | sort -u
```

For each file:
1. Open it and read the hex usage in context
2. Categorize each instance:
   - **Migrate to existing theme token** (e.g. `#FFFFFF` on dark scrim → `palette.white`)
   - **Migrate to existing palette ref** (e.g. `#8B949E` → `palette.charcoal[400]`)
   - **Add new theme token** (only if the colour adapts to theme AND there's no existing token)
   - **Keep as-is** (truly always-this-colour, e.g. camera viewfinder black)
3. For migrations: edit, typecheck, run tests
4. Commit per-file or per-batch of related files

**Skip rules** (preserve these as raw hex):
- `rgba(...)` semi-transparent overlays on always-black surfaces
- Brand-specific SVG fills inside `OpusMark` / `OpusLogo` (already
  parameterized; defaults are fine)
- Burn-depth diagram colours already migrated to `theme.burnDepth`
- Severity / pathology colours already migrated

**Stretch goal:** if any new clinical signal pattern emerges that
warrants a new token set (e.g. tendon repair colour-coding,
osteotomy fixation badges), add the token set with both light and
dark variants per the existing patterns (`theme.specialty`, `theme.role*`).

Target outcome: 132 → under 50 raw-hex instances in `client/`.

---

### 3. **`handleMultiDigitConfirm` decision — investigate + propose** (~30 min, source-level)

`client/components/DiagnosisGroupEditor.tsx:2100` has a 50-line
`useCallback` named `handleMultiDigitConfirm` that's defined but never
wired up. Comment: "Multi-digit confirm: create per-digit procedures
from resolution map". The only remaining `no-unused-vars` warning.

Investigate:
1. `git log -S 'handleMultiDigitConfirm' --all --oneline` — find when
   it was added and what commit context
2. Read `DigitMultiSelect` component if it exists — its props,
   particularly any `onConfirm` callback shape
3. Search for `pendingMultiDigitDiagnosis` usage — the variable
   `handleMultiDigitConfirm` closes over
4. Check `resolveDigitConfig` (the function it calls) — is it tested,
   used elsewhere?

If the answer is clear (e.g. there's a `DigitMultiSelect` already
rendered with no `onConfirm` prop, and the callback shape matches
exactly), **wire it up** with an `onConfirm={handleMultiDigitConfirm}`
prop and commit.

If the answer is ambiguous (e.g. the multi-digit selector is also
unused, or the resolution map function has no callers), **delete
both `handleMultiDigitConfirm` and `pendingMultiDigitDiagnosis`**
along with any related dead code. Commit.

Either way, the lone remaining `no-unused-vars` warning should go to
0 after this cluster.

---

### 4. **Audit for MORE perf opportunities** (~1 hour, source-level)

Session 5's React.memo audit covered the 6 components in the brief's
explicit list. There are likely more components that would benefit.

**Method 1 — Find components without React.memo:**

```bash
grep -rL "React.memo" /Users/mateusz/projects-local/Opus_Logbook/client/components --include="*.tsx" | \
  xargs -I {} grep -l "^export function\|^export default function" {}
```

For each unwrapped component:
1. Find its call sites with grep
2. Check if all props are reference-stable (strings, numbers, booleans,
   or useCallback-wrapped functions, or useMemo-wrapped objects/arrays)
3. If stable, wrap in React.memo
4. If NOT stable, look at the call site — can you stabilise with
   useCallback / useMemo there?

Prioritize:
- Components rendered inside lists (FlatList renderItem, .map())
- Components inside frequently-changing parents (case form, dashboard)
- Components with > 50 lines of render output

**Method 2 — Find unstable useCallback dep arrays:**

```bash
grep -rE "useCallback\([^)]*\), \[[^\]]*\]" /Users/mateusz/projects-local/Opus_Logbook/client | \
  grep -v __tests__
```

Look for useCallback dep arrays that include:
- Whole-state-bag objects (`state`, `form`, `procedure`)
- Array refs (`procedures`, `diagnosisGroups`) — unstable on every dispatch
- Inline expressions (already eliminated in session 5, but verify)

For each unstable callback, can you scope it tighter? (e.g. pull the
specific field out: `[procedure.id]` instead of `[procedure]`)

**Method 3 — Look for `.map((x, idx) =>` with inline-arrow children:**

This pattern produces N new closures per render. If the children are
components that could benefit from React.memo, the closure recreation
defeats memoization.

Document everything found in REPORT-session6.md. Fix anything where
the win is clear; flag the ambiguous ones for Mateusz.

---

### 5. **Test coverage gap audit** (~45 min, source-level)

Vitest doesn't show coverage by default, but the structure is
discoverable.

```bash
find /Users/mateusz/projects-local/Opus_Logbook/client/lib -maxdepth 1 -name "*.ts" \
  -not -name "*.test.ts" | sort
```

For each `.ts` file in `client/lib`, check if there's a corresponding
`__tests__/<name>.test.ts`. List the gaps in REPORT-session6.md.

For the gaps:
1. Read the file — is it pure logic (testable) or React-coupled (skip)?
2. For pure-logic files with 0 tests: write a smoke test (3-5 cases
   for the main exports) to lock in current behaviour
3. Prioritize:
   - Files with > 200 lines (broad surface area)
   - Files that handle clinical data (skinCancerConfig, burnsConfig,
     etc — anything specialty-config)
   - Files with date / cryptographic / patient-identity work

Don't try to hit full coverage in one session. Just close the most
critical gaps. Each test file = one commit.

Target: identify all gaps; close 3–5 of the most critical ones.

---

### 6. **CLAUDE.md drift audit** (~30 min, source-level)

The CLAUDE.md document is the single source of truth, but it can drift
from the code as the codebase evolves. Compare against current state.

**Check each:**
- "AI Testing & Visual Quality Standards" → "App Screen Map" — verify
  each listed screen file exists. Run:
  ```bash
  ls /Users/mateusz/projects-local/Opus_Logbook/client/screens/*.tsx | wc -l
  ```
  Compare to CLAUDE.md's "Total: 36 screen files" claim.
- "Diagnosis Inventory" table — check the count per specialty against
  the actual `LENGTH` of each picklist export
- "Case Form Architecture" — verify every named component still exists
  at the listed path
- "Module Activation Logic" — verify each rule still matches
  `client/lib/moduleVisibility.ts`
- "testID Convention" — count current testIDs:
  ```bash
  grep -rohE 'testID="[^"]*"' /Users/mateusz/projects-local/Opus_Logbook/client | sort -u | wc -l
  ```
  Compare to CLAUDE.md's "287 total testID definitions" claim
- "Design Tokens Reference" — verify theme.ts still defines every
  token mentioned

For each discrepancy: fix CLAUDE.md inline (it's the document of record).
Don't change code to match outdated docs.

---

### 7. **(Optional, requires sim) On-device verification of session 5 fixes** (~30 min)

ONLY START THIS if cluster 1 self-review passed AND you have time AND the
sim is healthy. If `xcrun simctl list devices | grep 6AF34D12 | grep -i
booted` returns nothing, skip this entire cluster.

Verification steps:
- BCRL staging — log a case → Lymphoedema → "BCRL — upper limb". Confirm
  staging block reads "ISL Stage". Capture screenshot.
- Post-melanoma lymphoedema upper + lower → confirm ISL.
- Aesthetics flow — verify no visual regression from session 5's
  unused-useMemo deletions.

Document captures in `screenshots/` with the `s6-` prefix. Findings to
REPORT-session6.md.

---

### 8. **(Optional, requires sim) Maestro flow extensions** (~30 min)

Same conditions as cluster 7.

Add 3 flows from the session 5 brief:
- `.maestro/case-form-skin-cancer.yaml`
- `.maestro/onboarding-replay.yaml`
- `.maestro/attention-card-actions.yaml`

Each ~20 lines per existing patterns. Use `id:` selectors only.

---

### 9. **(Optional, requires sim) Deep specialty captures** (~1 hour)

Same conditions as cluster 7.

Reach the surfaces session 4 + 5 didn't:
- Aesthetics ImplantDetailsCard
- ProcedureTeamFooter on 2+ procedure case
- Joint implant arthroplasty (`JointImplantSection`)
- Burns acute TBSA regional breakdown + body outline
- Free flap details with anastomosis entry card

---

## GUARDRAILS

- **Fix inline only OBJECTIVE defects** (dead code, real perf bugs,
  raw hex per CLAUDE.md, lint warnings pointing to real issues).
  Do NOT make subjective design changes — catalogue them.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- `server/` is **off-limits** unless a clinical bug surfaces.
- **Do not push to remote.** Do not trigger an EAS build.
- Before committing code, `npm run check:types` must stay clean.
  Tests must stay ≥ 1541. Lint warnings must not increase above 3.
- If you flip server-side state for testing, restore it before you
  finish.

## CRASH-RECOVERY

If a cluster goes sideways (TS errors you can't fix, tests fail,
unexpected behaviour), **revert the cluster's commits** with
`git reset --hard <sha>` to the last known-good commit before the
cluster, document the failure in REPORT-session6.md, and move to
the next cluster. Don't waste hours fighting a stuck cluster — the
goal is steady progress across the whole list.

If your overall scratch state gets dirty (uncommitted changes from
multiple half-done clusters):
1. `git status` to survey
2. `git stash` to save WIP
3. `git status` again to confirm clean
4. Start the next cluster from a clean state
5. Don't try to recover the stash unless you understand it

## PROVEN WORKING METHOD (from sessions 3–5)

- **`__DEV__` debug deep links** in `client/components/DevDeepLinkHandler.tsx`:
  `opus://debug/login`, `opus://debug/seed` (22 cases + 1 episode),
  `opus://debug/onboarding`. Fire via `xcrun simctl openurl booted "<url>"`.
- After ANY client code edit, force a fresh Metro bundle before
  testing — recipe in `REPORT-session3.md` "Tooling notes".
- `kAXErrorInvalidUIElement` workaround: coordinate-tap. Screenshot
  first to get coordinates.
- Screenshots: `.claude/audit-screenshot.sh <path>` (downscales to
  ≤1568 px). Theme: `xcrun simctl ui booted appearance light|dark`.

## END-OF-SESSION PROTOCOL

1. Commit any uncommitted screenshots + the in-progress `REPORT-session6.md`.
2. `REPORT-session6.md` needs: TL;DR, triaged findings, a commits
   table, an honest "Coverage & gaps".
3. If the priority list isn't finished, update this
   `NEXT-SESSION-PROMPT.md` for session 7 — rewrite the priority list
   to reflect what's left.
4. Final message to Mateusz: concise — what was done, what's left,
   any critical findings.

## SHAPE EXPECTATIONS

Sessions 2 and 4 hit ~6–8 commits each in their long-runs — that's the
target shape for this session too. Cluster 1 (self-review) might be
zero-commit if everything's clean; clusters 2 and 4 should produce
several commits each. The optional sim-dependent clusters (7–9) add
1–3 commits between them if the sim is healthy.

Aim for **5–10 commits total**. If you're past 12, you're probably
churning rather than making progress — pause and write the report.
