# Next-session prompt — Opus audit, session 7 (overnight autonomous)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. **Designed to run
> autonomously through the night** — work the priority list top-down,
> commit after every cluster, stop cleanly between clusters when context
> gets tight. Cluster 1 (perf refactor) is the meaty piece and should
> consume ~40% of the run; clusters 2–3 are mechanical fillers; clusters
> 4–6 are the sim-dependent visual work that should ONLY run if the
> simulator is already booted and healthy at session start — don't waste
> overnight time reviving fragile sim infrastructure.

---

You are continuing a multi-session visual + functional audit of **Opus**,
a full-stack Expo/React Native surgical logbook. Sessions 1–6 (2026-05-14/16)
have cleared the bulk of source-level audit findings:

- **Sessions 1–3:** 40-screen visual sweep, 11 specialty modules,
  populated-data surfaces, light-theme sweep, iPhone SE 3.
- **Session 4:** Dead routes deleted, testID + a11y backlog, raw-hex
  round 1, case-form Pressable a11y, HeadNeck React.memo.
- **Session 5:** Server BCRL/post-melanoma TNM-vs-ISL staging fix,
  vestigial PlanCase cleanup, React.memo perf audit (DiagnosisPicker /
  HandElectivePicker / ProcedureSubcategoryPicker), all 19
  react-hooks/exhaustive-deps closed, 18 import-duplicates, 29
  array-types, 82 unused-vars, raw-hex round 2.
- **Session 6:** Onboarding token activation + raw-hex round 3 (132 → 10),
  half-shipped multi-digit trigger digit feature wired up,
  ProcedureClinicalDetails React.memo + stable props, BreastProgressive
  picker handler stabilised, 4 test coverage gaps closed (+69 tests:
  moduleVisibility / caseNormalization / caseDiagnosisSummary /
  seniorityTier), CLAUDE.md drift fixes for 10+ quantitative claims.

**Current state:**
- **Tests:** 1614/1614 across 91 files.
- **Lint warnings:** 2 (both upstream `import/no-named-as-default` from
  `expo-server-sdk` and `express-rate-limit` — can't fix without forking).
- **`tsc --noEmit`:** clean.
- **Raw-hex in client/:** 10 (all legitimate per CLAUDE.md skip rules).
- **No remaining client-side lint warnings.**

Session 7 picks up the work session 6 explicitly deferred plus the
sim-dependent clusters that have been skipped since session 3.

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session6.md` — most recent. Its
   "Findings — triaged" + "Coverage & gaps" sections list what's left,
   including the perf refactor that's now the biggest remaining win.
2. `.claude/audit-2026-05-14/REPORT-session5.md`
3. `.claude/audit-2026-05-14/REPORT-session4.md`
4. `.claude/audit-2026-05-14/REPORT-session3.md` — has the "Tooling
   notes" with Maestro 2.5.1 kAXError workarounds. Read before driving
   the sim.
5. `.claude/audit-2026-05-14/REPORT-session2.md` + `REPORT.md`
6. `CLAUDE.md` → "AI Testing & Visual Quality Standards" + "Design
   Quality & Aesthetics".
7. Auto-loaded memory: `project_mac_dev_env.md`,
   `project_opus_visual_audit.md`, `feedback_testing_delegation.md`.

## ENVIRONMENT BRING-UP — verify but don't depend on it

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH=$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
```

**Source-level clusters (1–3) don't need the sim or API server.** They
run on:
- `npm run check:types` (must stay clean)
- `npx vitest run` (must stay green; can add tests)
- `npm run lint` (warning count must not increase above 2)

For the optional sim-dependent clusters (4–6): iPhone 17 sim UDID
`6AF34D12-7A59-439E-A861-768C5578B00A`, iOS 26.4. Verify before
attempting: `xcrun simctl list devices | grep 6AF34D12`. If the sim
isn't booted or the app isn't installed, **skip clusters 4–6** and
spend the remaining time on cluster 3 or write a follow-up audit
document. Don't burn time trying to revive the sim unattended.

## THE TASK — priority order

Write any new screenshots to `.claude/audit-2026-05-14/screenshots/`,
findings to a new `.claude/audit-2026-05-14/REPORT-session7.md`. **Work
the list top-down**; each cluster is independently committable.

---

### 1. **ProcedureEntryCard perf refactor — biggest remaining perf win** (~1.5 hours, source-level)

The session 6 perf audit (cluster 4 commit `088e5e5`) landed two
mechanical wins (ProcedureClinicalDetails memo, BreastProgressive picker
handler) but explicitly deferred the bigger refactor: stabilising the
procedure-mutation callbacks in DiagnosisGroupEditor so
ProcedureEntryCard.memo actually bails.

**The problem:**

`ProcedureEntryCard` is React.memo'd (session 4 work). It's mapped over
the `procedures` array in DiagnosisGroupEditor:

```tsx
{procedures.map((proc, idx) => (
  <ProcedureEntryCard
    procedure={proc}
    onUpdate={updateProcedure}                          // useCallback ✓
    onDelete={() => removeProcedure(proc.id)}           // inline arrow ✗
    onMoveUp={() => moveProcedureUp(proc.id)}           // inline arrow ✗
    onMoveDown={() => moveProcedureDown(proc.id)}       // inline arrow ✗
    ...
  />
))}
```

Every keystroke in ANY procedure rebuilds these 3 inline arrows for
every other procedure card, defeating the memo. With 4 procedures, every
keystroke triggers 4 unnecessary re-renders of unrelated ProcedureEntryCard
trees (and ProcedureClinicalDetails trees underneath).

Same issue applies to ProcedureEntryCard's internal `handlePicklistSelect`
(110-line auto-fill builder). It reads `procedure`, `diagnosisId`,
`clinicalGroup`, `diagnosisLaterality`, `profile`, `onUpdate`. Wrapping
in useCallback with these as deps would still recreate on every procedure
mutation.

**The fix pattern (ref-based stability):**

```tsx
// In DiagnosisGroupEditor
const proceduresRef = useRef(procedures);
proceduresRef.current = procedures;

const removeProcedure = useCallback((id: string) => {
  const target = proceduresRef.current.find((p) => p.id === id);
  // ... rest of body, reading from proceduresRef.current
  // setProcedures uses functional updater pattern (already does)
}, []);

const moveProcedureUp = useCallback((id: string) => {
  // setProcedures functional updater — no need for proceduresRef
}, []);

const moveProcedureDown = useCallback((id: string) => {
  // setProcedures functional updater — no need for proceduresRef
}, []);
```

For the call site, two options:

**Option A — change ProcedureEntryCard's API to take id-args:**
```tsx
// Before: onDelete: () => void
// After: onDelete: (id: string) => void

// Call site:
<ProcedureEntryCard
  onDelete={removeProcedure}      // raw function, stable
  onMoveUp={moveProcedureUp}      // raw function, stable
  onMoveDown={moveProcedureDown}  // raw function, stable
/>

// Inside ProcedureEntryCard:
<Pressable onPress={() => onDelete(procedure.id)}>
```

Inside the child the inline arrow is fine — it only recreates when
THIS child re-renders, which is the right behavior.

**Option B — keep API, use useCallback with the proc.id closure:**
```tsx
const handleDelete = useCallback(() => removeProcedure(proc.id), [proc.id]);
// Same for onMoveUp, onMoveDown
```

This creates N stable callbacks (one per procedure) instead of 1. Better
than the inline arrows but more complex than Option A.

**Recommended: Option A.** Cleaner API, smaller change, exactly the
React-Native idiom.

**Steps:**

1. Read [`client/components/DiagnosisGroupEditor.tsx:1875`](client/components/DiagnosisGroupEditor.tsx:1875)
   (removeProcedure / moveProcedureUp / moveProcedureDown definitions).
2. Read [`client/components/ProcedureEntryCard.tsx:56`](client/components/ProcedureEntryCard.tsx:56)
   (ProcedureEntryCardProps interface) and lines 110-227 (handlePicklistSelect).
3. Refactor:
   - Add `proceduresRef = useRef(procedures); proceduresRef.current = procedures` to DiagnosisGroupEditor.
   - Convert removeProcedure / moveProcedureUp / moveProcedureDown to
     useCallback with `[]` deps, reading via proceduresRef.current.
   - Change ProcedureEntryCardProps: `onDelete: (id: string) => void`,
     `onMoveUp?: (id: string) => void`, `onMoveDown?: (id: string) => void`.
   - Update the two call sites in DiagnosisGroupEditor (lines 4040 and 4130).
   - Update the call site in BreastProgressiveAssessment (line 1503).
   - Inside ProcedureEntryCard: where these callbacks were called, change
     `onPress={onDelete}` to `onPress={() => onDelete(procedure.id)}`.
4. For `handlePicklistSelect`: wrap in useCallback with deps `[diagnosisId,
   clinicalGroup, diagnosisLaterality, onUpdate, profile]`. Read `procedure`
   via a similar `procedureRef` pattern (the body needs the current procedure
   to spread its fields).
5. `npm run check:types` clean.
6. `npx vitest run` — should stay 1614. **Tests don't currently cover
   procedure delete/move callbacks; consider adding 2-3 if there's an
   existing test surface.**
7. **No regression test for the perf win itself** — perf is hard to test
   in vitest. Manual sim check (clusters 4-6 if available) would help.

Commit when each piece compiles + tests stay green.

---

### 2. **More test coverage** (~1 hour, source-level)

Session 6 closed 4 of 12 identified gaps. Continue with the next batch.

**Method 1: list-by-priority (already done in session 6 report).** Next 6:

| File | Lines | Priority | Why it matters |
|------|-------|----------|-------|
| moduleSummary | 328 | Medium-High | Summary text per module, used in CaseSummaryView |
| melanomaStaging | 419 | Medium-High | AJCC 8th Ed staging logic |
| procedureConfig | 393 | Medium | Procedure metadata |
| episodeHelpers | 86 | Medium | Episode link/update plans |
| handElectiveFlow | 65 | Low-Medium | SNOMED fallback state builder (small surface) |
| buildShareableBlob | 39 | Low | E2EE blob construction (already has indirect coverage via sharingBridge.test.ts) |

**For each file:**

1. Read the file end-to-end to understand the exports.
2. Identify the most important contract (data shape, error handling,
   edge cases).
3. Write 5-10 focused tests covering the main exports.
4. `npx vitest run <filename>` — should pass.
5. `npx vitest run` (full suite) — should stay green.
6. Commit per file (or per batch of 2-3 related files).

**Target: close 3 of the 6 above this session.**

**Skip rule:** If a file is dominated by side effects (AsyncStorage,
expo APIs, fetch), it needs mocks — defer to a future session that
explicitly takes that on. The session 6 work focused on pure-logic files
exactly to avoid this.

---

### 3. **CLAUDE.md App Screen Map table cleanup** (~30 min, source-level)

Session 6 fixed the quantitative drift (33 vs 27, 10 vs 9, 43 vs 36) and
added a footnote enumerating the 6 missing screens. But the table itself
at `CLAUDE.md:1543+` still doesn't have rows for those screens.

Add rows for:
- AssessmentScreen
- AssessmentHistoryScreen
- AssessmentRevealScreen
- SharedCaseDetailScreen
- SharedInboxScreen
- OnboardingScreen

For each: source file, testID prefix (if any), presentation type (push /
modal / fullScreenModal). Use grep on the navigation files to verify.

Also verify the testID prefix table at `CLAUDE.md:1765+` is current —
session 6 saw testID growth from 287 → 396, suggesting new prefixes may
have been added but not documented.

---

### 4. **(Optional, requires sim) On-device verification of session 5+6 fixes** (~30 min)

ONLY START THIS if the sim is healthy. Verify:
- `xcrun simctl list devices | grep 6AF34D12 | grep -i booted` returns
  something.
- If not, skip this entire cluster.

**Steps:**

- BCRL staging — log a case → Lymphoedema → "BCRL — upper limb".
  Confirm staging block reads "ISL Stage". Capture screenshot with prefix
  `s7-bcrl-`.
- Post-melanoma lymphoedema upper + lower → confirm ISL.
- Trigger digit multi-select — log a case → Hand surgery (elective) →
  Stenosing Tenosynovitis → Trigger finger / thumb. Confirm
  DigitMultiSelect appears with 5 chips (Thumb / Index / Middle / Ring /
  Little). Capture screenshot prefix `s7-trigger-`.
- ProcedureClinicalDetails — log a free flap case (orthoplastic specialty,
  ALT or DIEP). Confirm the inline FreeFlapClinicalFields render. Capture.

Document captures in `screenshots/` with `s7-` prefix. Findings to
REPORT-session7.md.

---

### 5. **(Optional, requires sim) Maestro flow extensions** (~30 min)

Same conditions as cluster 4.

Add 3 flows from the session 5 brief:
- `.maestro/case-form-skin-cancer.yaml`
- `.maestro/onboarding-replay.yaml`
- `.maestro/attention-card-actions.yaml`

Each ~20 lines per existing patterns. Use `id:` selectors only.

---

### 6. **(Optional, requires sim) Deep specialty captures** (~1 hour)

Same conditions as cluster 4.

Reach the surfaces sessions 4 + 5 + 6 didn't:
- Aesthetics ImplantDetailsCard
- ProcedureTeamFooter on 2+ procedure case
- Joint implant arthroplasty (`JointImplantSection`)
- Burns acute TBSA regional breakdown + body outline
- Free flap details with anastomosis entry card

---

## GUARDRAILS

- **Fix inline only OBJECTIVE defects** (dead code, real perf bugs,
  lint warnings pointing to real issues). Do NOT make subjective design
  changes — catalogue them.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- `server/` is **off-limits** unless a clinical bug surfaces.
- **Do not push to remote.** Do not trigger an EAS build.
- Before committing code, `npm run check:types` must stay clean.
  Tests must stay ≥ 1614. Lint warnings must not increase above 2.
- If you flip server-side state for testing, restore it before you
  finish.

## CRASH-RECOVERY

If a cluster goes sideways (TS errors you can't fix, tests fail,
unexpected behaviour), **revert the cluster's commits** with
`git reset --hard <sha>` to the last known-good commit before the
cluster, document the failure in REPORT-session7.md, and move to
the next cluster. Don't waste hours fighting a stuck cluster — the
goal is steady progress.

If your overall scratch state gets dirty (uncommitted changes from
multiple half-done clusters):
1. `git status` to survey
2. `git stash` to save WIP
3. `git status` again to confirm clean
4. Start the next cluster from a clean state
5. Don't try to recover the stash unless you understand it

## PROVEN WORKING METHOD (from sessions 3–6)

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

1. Commit any uncommitted screenshots + the in-progress `REPORT-session7.md`.
2. `REPORT-session7.md` needs: TL;DR, triaged findings, a commits
   table, an honest "Coverage & gaps".
3. If the priority list isn't finished, update this
   `NEXT-SESSION-PROMPT.md` for session 8 — rewrite the priority list
   to reflect what's left.
4. Final message to Mateusz: concise — what was done, what's left,
   any critical findings.

## SHAPE EXPECTATIONS

Sessions 5+6 hit 6-8 commits each. The ref-based perf refactor in cluster
1 is likely 1 commit (~200 line diff across 3 files). Each test coverage
file is 1 commit. The CLAUDE.md cleanup is 1 commit. The sim-dependent
clusters add 1-3 commits between them if the sim is healthy.

Aim for **4-8 commits total** depending on how much sim-dependent work
runs. If past 12, you're probably churning — pause and write the report.
