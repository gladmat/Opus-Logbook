# Next-session prompt — Opus audit, session 8 (overnight autonomous)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. **Designed to run
> autonomously through the night** — work the priority list top-down,
> commit after every cluster, stop cleanly between clusters when context
> gets tight. Source-level clusters 1–3 are the meaty pieces and should
> consume ~80% of the run; cluster 4–6 work is OPTIONAL and only runs
> if the simulator AND interactive tap tooling are both available at
> session start. **Do not waste overnight time reviving fragile sim
> infrastructure** — if computer-use MCP isn't loaded in the deferred
> tool list, skip clusters 4–6 entirely and add more test coverage
> instead.

---

You are continuing a multi-session visual + functional audit of **Opus**,
a full-stack Expo/React Native surgical logbook. Sessions 1–7 (2026-05-14/16)
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
- **Session 7:** ProcedureEntryCard ref-based perf refactor (stable
  handlePicklistSelect + removeProcedure/moveProcedureUp/moveProcedureDown
  via proceduresRef pattern); 3 more 0-coverage lib files closed
  (melanomaStaging / episodeHelpers / handElectiveFlow, +54 tests);
  CLAUDE.md App Screen Map table self-contained (added 6 missing screen
  rows, 9 new testID prefixes, removed 1 stale prefix); sim smoke
  verified Cluster 1 refactor survives boot + 22-case seeded dashboard
  renders cleanly.

**Current state:**
- **Tests:** 1668/1668 across 94 files.
- **Lint warnings:** 2 (both upstream `import/no-named-as-default` from
  `expo-server-sdk` and `express-rate-limit` — can't fix without forking).
- **`tsc --noEmit`:** clean.
- **Raw-hex in client/:** 10 (all legitimate per CLAUDE.md skip rules).

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session7.md` — most recent. Its
   "Findings — triaged" + "Coverage & gaps" sections list what's left.
2. `.claude/audit-2026-05-14/REPORT-session6.md`
3. `.claude/audit-2026-05-14/REPORT-session5.md`
4. `.claude/audit-2026-05-14/REPORT-session4.md`
5. `.claude/audit-2026-05-14/REPORT-session3.md` — has the "Tooling
   notes" with Maestro 2.5.1 kAXError workarounds. Read before driving
   the sim. Note session 7 also discovered Maestro `launchApp` resets
   AsyncStorage state (kills debug login).
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

For optional sim-dependent clusters (4–6): iPhone 17 sim UDID
`6AF34D12-7A59-439E-A861-768C5578B00A`, iOS 26.4. Session 7 verified the
sim boots clean from shutdown (no CoreSimulatorService -9 issue) and
Metro on port 8081 works. Bundle is ~24s for 3752 modules. Debug deep
links work: `opus://debug/login`, `opus://debug/seed`. **The blocker**
session 7 hit is **lack of interactive tap tooling** — `computer-use`
MCP wasn't loaded, and Maestro 2.5.1's `launchApp` resets app state.
**Before attempting Cluster 4+**, verify either:
- `computer-use` MCP is available (check deferred tools list for
  `mcp__computer-use__*`)
- OR a Maestro pattern that preserves state across `launchApp` is found
  (e.g. `clearState: false` if supported in 2.5.1)
- OR you can drive the sim via direct `xcrun simctl` tap commands
  (these don't exist in stock simctl — the prompt's previous claims of
  "coordinate-tap workaround" need verification)

If none of these work, **skip clusters 4–6** and spend the time on the
source-level work.

## THE TASK — priority order

Write findings to a new `.claude/audit-2026-05-14/REPORT-session8.md`.
**Work the list top-down**; each cluster is independently committable.

---

### 1. **Test coverage — finish the 5 remaining priority files** (~1.5 hours, source-level)

Session 7 closed melanomaStaging, episodeHelpers, handElectiveFlow.
Session 6 closed moduleVisibility, caseNormalization,
caseDiagnosisSummary, seniorityTier. That leaves 5 of the original 12
0-coverage files:

| File | Lines | Priority | Notes |
|------|-------|----------|-------|
| moduleSummary | 328 | Medium | Display strings; mostly mechanical |
| procedureConfig | 393 | Medium | Procedure metadata; data-only |
| buildShareableBlob | 39 | Low (indirect coverage exists) | Already covered indirectly via sharingBridge.test.ts; add direct tests for completeness |
| handElectiveFlow.buildSnomedFallback **already covered** | — | done | (sanity check — session 7 covered this) |
| The I/O surface (auth / sharingApi / teamContactsApi / assessmentApi / discoveryService) | various | Defer | Needs fetch-mock setup — should be a dedicated session |

**Target: close moduleSummary + procedureConfig + buildShareableBlob.**
Skip the I/O surface — that's a future dedicated session.

**For each file:**
1. Read end-to-end to understand exports.
2. Identify the most important contract.
3. Write 5-15 focused tests covering the main surface.
4. `npx vitest run <filename>` clean.
5. `npx vitest run` (full suite) stays green.
6. Commit per file or in a small batch.

---

### 2. **Clinical-correctness fix — Melanoma N3c short-circuit** (~30 min, source-level)

Session 7 discovered (and locked in tests) a bug in
`client/lib/melanomaStaging.ts:160-202`. Per AJCC 8th Ed, **≥2 nodes +
in-transit metastases should be N3c**. The current implementation locks
the satellite info into a separate `hasSatelliteInTransit` boolean but
doesn't promote `nSubstage` to N3c. The third conditional
(`positiveNodes >= 4 || (positiveNodes >= 1 && satelliteInTransit)`)
has dead code: the `>= 1 && satelliteInTransit` branch never fires
because earlier `=== 1` and `2-3` branches already returned.

**Fix approach:**
1. Add an early N3c check before the early N1/N2 returns:
   ```ts
   if (lnStatus === "positive" && positiveNodes >= 1 && satelliteInTransit) {
     return {
       nStage: "N3",
       nSubstage: "N3c",
       description: `N3c: ${positiveNodes} positive node(s) plus in-transit metastases`,
       hasSatelliteInTransit: true,
     };
   }
   ```
   Just before the `if (positiveNodes === 1)` branch.
2. Update the existing **regression-guard tests** in
   `client/lib/__tests__/melanomaStaging.test.ts` — specifically the
   "preserves satelliteInTransit flag on N1/N2" test, which currently
   asserts the BUGGY behavior. Flip it to assert the CORRECT N3c
   behavior.
3. Also update the "N3 for ≥4 nodes" test to cover the N3c path.
4. Then check `calculateOverallStage(t, "N3C")` handling — currently
   it routes via the IIIC catch-all. May need explicit N3C handling
   in IIID (currently `t === "T4B" && n === "N3"` triggers IIID; we
   want T4B + N3c to still be IIID).

**Verification:**
- `npx vitest run client/lib/__tests__/melanomaStaging.test.ts`
- Full suite stays green.

**Commit message** should call out the clinical correctness shift —
this is a behavioral change that affects displayed Stage for a small
subset of cases. The user should review.

---

### 3. **CLAUDE.md drift audit round 2** (~30 min, source-level)

Session 6 fixed 10+ quantitative claims. Session 7 fixed the App
Screen Map table + testID prefix table. New drift may have crept in
across sessions 6+7. Quick audit:

1. **Test count**: should be 1668 across 94 files. Check `CLAUDE.md`
   "Testing" section at line ~1477.
2. **testID count**: re-compute via
   `grep -roh 'testID="[^"]*"' client/ | sort -u | wc -l` and
   `grep -roh 'testID="[^"]*"' client/ | wc -l`. Compare to the
   "Current testID count: 269 unique static + 127 unique dynamic" claim.
3. **Diagnosis Inventory** counts: spot-check a couple via
   `wc -l client/lib/diagnosisPicklists/<name>.ts`. May have drifted
   if any new diagnosis was added between sessions.
4. **Phase status entries** (Phases 5/6/7/7.1): historical, not state
   claims. Skip.
5. **Component counts** (e.g. "client/components/case-form/ 6 sections"):
   verify against actual directory listing.

Fix anything off; small commit.

---

### 4. **(Optional, requires sim + tap tooling) Interactive sim verification** (~30-45 min)

ONLY START THIS if interactive tap tooling is available. Session 7
proved sim + Metro + deep links work but couldn't verify session 5+6
fixes interactively. Items to verify:

- **BCRL → ISL staging (session 5)**: Log a case → Specialty: Lymphoedema
  → Diagnosis: "BCRL — upper limb". Confirm the staging block reads
  "ISL Stage" (not TNM). Screenshot prefix `s8-bcrl-`.
- **Post-melanoma lymphoedema upper + lower**: same flow, different
  diagnosis. Confirm ISL.
- **Trigger digit multi-select (session 6)**: Log a case → Hand surgery
  (elective) → Stenosing Tenosynovitis → Trigger finger/thumb. Confirm
  DigitMultiSelect appears with 5 chips (Thumb / Index / Middle / Ring
  / Little). Screenshot prefix `s8-trigger-`.
- **ProcedureClinicalDetails inline render**: Log a free flap case
  (orthoplastic, ALT or DIEP). Confirm inline FreeFlapClinicalFields
  render. Screenshot.
- **Cluster 1 perf gains**: navigate to a case with 3+ procedures,
  type rapidly in notes of one procedure, watch React DevTools (if
  available) for re-render counts. ProcedureSubcategoryPicker should
  bail on the other procedures.

Document captures in `screenshots/` with `s8-` prefix.

---

### 5. **OnboardingScreen.tsx deletion** (~15 min, source-level — NOT sim-dependent)

Session 7 marked `client/screens/OnboardingScreen.tsx` as orphaned dead
code (no navigator imports it; superseded by current onboarding chain).
The session-4 cleanup pattern was: delete the file + check no imports
break. Apply that here:

1. `grep -rn "OnboardingScreen" client/ server/ shared/` (excluding
   `.claude/`, `node_modules/`) — confirm zero importers.
2. Delete the file.
3. `npm run check:types` clean.
4. `npx vitest run` green.
5. Also remove the "Orphaned (in `client/screens/` but not wired into
   any navigator)" stanza from CLAUDE.md at line ~1612 (the explicit
   orphaned annotation session 7 added).
6. Commit with the message style of session 4 dead-code deletions.
   Don't push to remote — let Mateusz review the deletion before push.

---

### 6. **ProcedureEntryCard internal callback stabilisation** (~30 min, source-level)

Session 7's Cluster 1 stabilised the heaviest ProcedureEntryCard
internal callback (`handlePicklistSelect`). Several lighter callbacks
remain as plain functions: `handleProcedureNameChange`,
`handleNotesChange`, `handleSpecialtyChange`, `handleRoleOverrideChange`,
`handleSupervisionOverrideChange`, `handleResetOverrides`,
`handleSnomedProcedureSelect`, `handleTagToggle`. Each is passed to a
memo'd FormField / PickerField as `onChange`.

Wins are marginal individually (FormField/PickerField don't have the
heavy specialty-dispatched body of ProcedureSubcategoryPicker), but
they're cheap to batch:

1. Wrap each in `useCallback` with appropriate deps. All can read
   `procedure` via the existing `procedureRef` from session 7.
2. `npm run check:types` clean.
3. `npx vitest run` green.

---

### 7. **N3c clinical correctness fix — `calculateOverallStage` follow-up** (~20 min, source-level — DO ONLY IF Cluster 2 (the N3c short-circuit) shipped cleanly)

Session 7's Cluster 2 spec mandates fixing the early N3c return in
`calculateNStage`. AFTER that fix lands, also verify
`calculateOverallStage(t, "N3C")` handling:

1. Read `client/lib/melanomaStaging.ts:215-345` (`calculateOverallStage`).
2. The current explicit IIID check is `t === "T4B" && n === "N3"` —
   verify that this still hits for `n === "N3C"` (which it doesn't, because
   `=== "N3"` is strict-equality).
3. Fix: change to `(n === "N3" || n === "N3C")` or `n.startsWith("N3")`.
4. Mirror the change in any IIIC catch-all path that depends on N-stage
   string matching.
5. Add 1-2 tests in `melanomaStaging.test.ts`: `T4b + N3c → IIID`,
   `T3a + N3c → IIIC`.

---

## FALLBACK WORK (if everything above is done, or if cluster 4–6 are skipped due to missing tap tooling)

Pick the highest-value source-level work that fits the remaining budget.
Don't sit idle.

- **More cleanup of plain-function callbacks** across other heavy
  components: `DiagnosisGroupEditor` has many `handle*` functions that
  could be useCallback'd. Same pattern as session 7 Cluster 1 / session 8
  Cluster 6.
- **moduleSummary test coverage** — 328 lines, mostly display strings.
  Mechanical. 10–20 focused tests.
- **procedureConfig test coverage** — 393 lines, procedure metadata.
  Mostly data assertions. Could be a big +30 tests batch.
- **CLAUDE.md drift round 3** — verify all the post-session-7 numbers
  are still accurate. Re-run the test/testID/diagnosis counts.
- **Hunt for new dead code** — grep across `client/lib/` and
  `client/components/` for exports with zero importers. Pattern:
  for each `export function X` / `export const X` in a file, grep for
  `\bX\b` everywhere else and confirm > 0 hits. If 0, the export is
  dead.
- **Raw-hex round 4** — re-grep `'#[0-9A-Fa-f]\{3,8\}'` across
  `client/` and verify the count is still 10. New hex may have crept
  in across sessions 6+7.

---

## GUARDRAILS

- **Fix inline only OBJECTIVE defects** (dead code, real perf bugs,
  lint warnings pointing to real issues). Do NOT make subjective design
  changes — catalogue them.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- `server/` is **off-limits** unless a clinical bug surfaces.
- **Do not push to remote.** Do not trigger an EAS build.
- Before committing code, `npm run check:types` must stay clean.
  Tests must stay ≥ 1668. Lint warnings must not increase above 2.
- If you flip server-side state for testing, restore it before you
  finish.

## CRASH-RECOVERY

If a cluster goes sideways, `git reset --hard` to the last known-good
commit before the cluster, document the failure in REPORT-session8.md,
move to the next cluster. Don't waste hours fighting stuck clusters.

If scratch gets dirty: `git status` → `git stash` → confirm clean →
next cluster.

## PROVEN WORKING METHOD (from sessions 3–7)

- `__DEV__` debug deep links in `client/components/DevDeepLinkHandler.tsx`:
  `opus://debug/login` (signs in as `m.gladysz@outlook.com`),
  `opus://debug/seed` (22 cases + 1 episode),
  `opus://debug/onboarding`. Fire via
  `xcrun simctl openurl 6AF34D12-7A59-439E-A861-768C5578B00A "<url>"`.
- After ANY client code edit, force a fresh Metro bundle before
  testing.
- Screenshots via `xcrun simctl io 6AF34D12-7A59-439E-A861-768C5578B00A screenshot <path>.png`
  — no need for the audit-screenshot.sh wrapper for non-iCloud-preview
  cases.
- Sim boots cleanly from `Shutdown` state with `xcrun simctl boot <udid>`
  (session 7 confirmed; no CoreSimulatorService issues).
- **Maestro 2.5.1 gotchas**:
  - `launchApp` RESETS AsyncStorage. Use deep-link login INSIDE the
    Maestro flow via `openLink`, not before it.
  - Em-dash text matching fails. Use `id:` (testID) selectors.

## END-OF-SESSION PROTOCOL

1. Commit any uncommitted screenshots + the in-progress `REPORT-session8.md`.
2. `REPORT-session8.md` needs: TL;DR, triaged findings, a commits
   table, an honest "Coverage & gaps".
3. Update this `NEXT-SESSION-PROMPT.md` for session 9 — rewrite the
   priority list to reflect what's left.
4. Final message to Mateusz: concise — what was done, what's left, any
   critical findings.

## SHAPE EXPECTATIONS

Source-level clusters 1–3 should yield 3–5 commits. The N3c fix
(cluster 2) is a single small commit. Test coverage (cluster 1) is
1 commit per file (up to 3 commits). CLAUDE.md drift (cluster 3) is
1 commit.

Aim for **4–8 commits total** depending on optional clusters and
fallback work. Past 12 and you're churning — pause and write the
report.

## TIME BUDGET PER CLUSTER (rough)

| Cluster | Budget | Cumulative |
|---------|--------|------------|
| 1 — Test coverage 3 files | 1.5 hours | 1.5h |
| 2 — N3c clinical fix | 30 min | 2.0h |
| 3 — CLAUDE.md drift round 2 | 30 min | 2.5h |
| 4 — Interactive sim verification | 45 min (OPTIONAL — skip if no tap tooling) | 3.25h |
| 5 — OnboardingScreen deletion | 15 min | 3.5h |
| 6 — More callback stabilisation | 30 min | 4.0h |
| 7 — N3c overall-stage follow-up | 20 min | 4.3h |
| Fallback work | variable | until report |

If you finish all priority work plus some fallback by hour 5, write
the report and stop. Don't grind into hour 8 — diminishing returns.

## REMINDERS FOR THE NIGHT

- The user is asleep. You will get **no clarification** until morning.
  When in doubt about whether to fix something, **catalogue it in the
  report instead of fixing it**. Better to under-do than to ship a
  surprise.
- **Don't push to remote** under any circumstances.
- **Don't trigger EAS / TestFlight builds.**
- **Don't run destructive git ops** (reset --hard onto known-good
  commits is fine within the crash-recovery flow; nothing beyond that).
- If you finish early, **stop**. The morning report should be readable
  in 5 minutes.
- The untracked `.claude/plans/archive/` directory is pre-existing
  scratch — leave it alone, don't try to commit or clean it.
