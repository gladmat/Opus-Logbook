# Opus visual + functional audit — 2026-05-16 (Session 8)

**Continuation of** `REPORT-session7.md` / `REPORT-session6.md` /
`REPORT-session5.md` / `REPORT-session4.md` / `REPORT-session3.md` /
`REPORT-session2.md` / `REPORT.md` / `NEXT-SESSION-PROMPT.md`.
**App version under test:** 2.7.0 + Phase 7.1 follow-ups + sessions 2–7
commits + this session's commits.
**Build flavour:** Source-level only (no sim, no API server).
**Tooling:** `npm run lint`, `npm run check:types`, `npx vitest run`.

---

## TL;DR

Session 8 was a strong autonomous run. Every priority cluster from
`NEXT-SESSION-PROMPT.md` either landed or was already done. **7 commits
shipped**, tests went 1668 → 1766 (+98), `tsc --noEmit` clean throughout,
lint warnings unchanged at 2 (both upstream).

- 🟢 **Cluster 2 + 7 — Melanoma N3c clinical-correctness fix** (commit
  `8588b9c`). Session 7 discovered + locked the bug; session 8 fixed it.
  `calculateNStage` in `client/lib/melanomaStaging.ts` now promotes
  `positiveNodes >= 1 && satelliteInTransit` to **N3c** before falling
  through to the N1a/N1b/N2a/N2b branches. The dead third-conditional
  `OR satelliteInTransit` branch (unreachable because earlier `=== 1` /
  `2-3` returned first) is removed and replaced by an early N3c check.
  `calculateOverallStage` updated in lock-step: the IIID and IIIC
  thin-T branches used strict `n === "N3"` which never fired for the
  new `N3c` substage. Both now use `n.startsWith("N3")` so N3a/N3b/N3c
  all route correctly (T4b + any N3 → IIID; thin/thick T + N3c → IIIC).
  The existing "preserves satelliteInTransit flag on N1/N2" test was
  flipped from locking the BUGGY contract to asserting the corrected
  N3c behaviour; 3 new IIID/IIIC routing tests added for N3a/N3b/N3c
  + thick/thin T combinations. **Behavioural change** affecting
  displayed Stage for a small subset of melanoma cases (those with
  both nodal involvement and satellite/in-transit metastases) — worth
  a clinical review before push.
- 🟢 **Cluster 1a — moduleSummary test coverage** (commit `1886e36`,
  +41 tests). Locks the chip-style summary string contract for 8
  module-summary generators (flap / fracture / hand trauma /
  hand-trauma-assessment / infection / hand infection /
  wound / breast). Surfaces include collapsible-section headers in the
  case form + CaseDetailScreen — downstream components grep for unit
  suffixes and L:/R: side prefixes so silent formatter drift would
  appear as missing on-screen text. Tests cover pluralisation (1 →
  singular, ≥2 → plural), per-side precedence ladder for breast
  (implant > flap > masc > lipofilling), L×W vs L×W×D vs Area
  fallback for wound, "N/A" laterality fall-through for infection,
  and the affectedDigits fallback rule for hand trauma (only when no
  other parts populated).
- 🟢 **Cluster 1b — procedureConfig test coverage** (commit `a9e5ba9`,
  +37 tests). Locks the per-specialty form blueprint registry that
  drives the legacy clinical-details forms and AI-extraction prompts.
  **Finding while writing tests:** the `aesthetics` registry key points
  at `BODY_CONTOURING_CONFIG` whose internal `id` is `"body_contouring"`
  — a quirk left over from the aesthetics merge. Locked the actual
  contract; any future "fix the id" refactor must update this test
  deliberately. Covers: registry completeness vs Specialty union,
  unique field keys per specialty, select-option shape, breast
  laterality required + options, hand surgery 8 standard mechanisms,
  body contouring unit suffixes, orthoplastic Gustilo-Anderson grades,
  head & neck dissection levels, cleft type union + named technique
  placeholder, shared histology triplet across skin_cancer + general,
  empty fields arrays for assessment-component specialties (burns /
  lymphoedema / peripheral_nerve), `getConfigForSpecialty` identity
  check, `getDefaultClinicalDetails` per-type seeding.
- 🟢 **Cluster 1c — buildShareableBlob test coverage** (commit
  `19a77dd`, +17 tests). The existing `sharingBridge.test.ts` had
  indirect coverage for `operativeTeam` handling; this is the first
  direct test of the full SharedCaseData extraction contract. Tests
  the patient identity passthrough, clinical-record fields, field
  renaming (`admissionUrgency` → `urgency`,
  `defaultOperativeRole` → `operativeRole`,
  `defaultSupervisionLevel` → `supervisionLevel`), nested `outcomes`
  sub-object (always present, even when all fields undefined — the
  receiver UI reads it unconditionally), and the **exclusion list**
  (personalNotes, episodeId, operativeMedia, id, ownerId, caseStatus,
  createdAt, updatedAt, handCaseType, isPlanMode, clinicalDetails
  NEVER appear in the blob). Shape stability test verifies the exact
  set of 15 top-level keys to catch any future "add field, forget to
  add to test" silent over-share regression.
- 🟢 **Cluster 5 — OnboardingScreen.tsx deletion** (commit `60b4874`).
  Session 7 flagged it as orphaned. Verified zero importers via
  `grep -rn`, deleted the file (-1132 lines), updated CLAUDE.md:
  dropped the "Orphaned" stanza, screen-count tally adjusted
  (33 main → 32 main, 43 total → 42 total), folded into the
  existing session-4 cleanup note as "session-4 / session-8 audit
  cleanups" listing four deleted routes. tsc + lint + 1766 tests all
  pass post-deletion.
- 🟢 **Cluster 3 — CLAUDE.md drift round 2** (commit `73579fa`).
  Re-measured every quantitative claim and synced ground truth:
  - Test count: 1614 across 91 → 1766 across 97 (added the session 7
    +54 and session 8 +101)
  - testID counts: 269 + 127 = 396 → 258 + 123 = 381 (drop from
    OnboardingScreen deletion). Raw static-string definitions
    288 → 277; total prop usages 420 → 440 (session 7's measurement
    was inaccurate even then — re-measured at session-7 commit was
    actually 455, so net change from session 7 baseline is -15 from
    OnboardingScreen)
  - Component counts: hand-trauma/ 15 → 14, skin-cancer/ 14 → 12,
    breast/ 18 → 17 — all .tsx file-counts brought to ground truth
  - Missing component: media/ list updated to include
    MediaGalleryViewer (was missing despite the Phase 5 mention
    earlier in CLAUDE.md)
  - skinCancerConfig.ts: 1058 → 1260 lines
  - client/lib/__tests__/: 85 → 83 files (session-7 figure was
    inaccurate; ground truth is 83 after session-8's +3 adds)

  Diagnosis Inventory counts (106/88/42/19/38/37/34/57/29/16/11
  across the 11 picklist files) verified by
  `grep -cE '^\s{4}id:'` — all already correct.
- 🟢 **Cluster 6 — ProcedureEntryCard internal callback
  stabilisation** (commit `d334e5c`). Session 7 stabilised the
  heaviest callback (`handlePicklistSelect`); session 8 wraps the
  remaining eight in `useCallback` with `[onUpdate]` deps reading the
  latest procedure via `procedureRef.current` (already set up in
  session 7):
  - `handleSpecialtyChange`
  - `handleProcedureNameChange`
  - `handleRoleOverrideChange`
  - `handleSupervisionOverrideChange`
  - `handleResetOverrides`
  - `handleSnomedProcedureSelect`
  - `handleNotesChange`
  - `handleTagToggle`

  Also tightened `handleClinicalDetailsUpdate`: was already
  `useCallback`'d but listed `procedure` as a dep, which recreated the
  callback on every procedure change and defeated the
  `ProcedureClinicalDetails.memo` bail. Now reads via
  `procedureRef.current` with just `[onUpdate]` deps.

  Pure refactor — no behavioural change. The stable references let
  the memo'd children (FormField, PickerField, SnomedProcedurePicker)
  bail on parent renders driven by typing in unrelated fields.
- 🟡 **Optional Cluster 4 (interactive sim verification)** — SKIPPED.
  computer-use MCP not loaded; Maestro 2.5.1 launchApp-reset blocker
  still in place. Carried forward to session 9 with same triggers.
- 🟢 **Fallback raw-hex check** — confirmed clean. Outside test
  directories, only 3 files contain raw hex: `theme.ts` (canonical
  source), `theme/tokens.ts` (design tokens), and
  `MediaGalleryViewer.tsx` (the documented `#555` + `#999` chrome).
  Nothing actionable.

**Commits this session: 7.** Tests went 1668 → 1766 (+98).
Lint warnings unchanged at 2. `tsc --noEmit` clean throughout.
No screenshots — no sim work this session.

---

## Commits landed this session

| Commit | Summary |
|--------|---------|
| `8588b9c` | Fix melanoma N3c short-circuit per AJCC 8th Ed (clinical-correctness behavioural change + 3 new tests) |
| `1886e36` | Cover moduleSummary generators (+41 tests) |
| `a9e5ba9` | Cover procedureConfig registry (+37 tests) |
| `19a77dd` | Add direct buildShareableBlob coverage (+17 tests) |
| `60b4874` | Delete orphaned OnboardingScreen.tsx + sync CLAUDE.md |
| `73579fa` | CLAUDE.md drift round 2 — sync test/testID/component counts |
| `d334e5c` | Stabilise remaining ProcedureEntryCard handlers via procedureRef |

---

## Cluster 2 + 7 details — Melanoma N3c clinical fix

### Implementation

`client/lib/melanomaStaging.ts:160-203`:

```ts
// Before — N1/N2 branches returned first, dead OR branch on N3:
if (positiveNodes === 1) { ... return N1a/N1b ... }
if (positiveNodes >= 2 && positiveNodes <= 3) { ... return N2a/N2b ... }
if (positiveNodes >= 4 || (positiveNodes >= 1 && satelliteInTransit)) {
  // The OR clause is dead code — earlier branches returned for nodes 1, 2-3.
  return N3
}

// After — early N3c short-circuit:
if (positiveNodes >= 1 && satelliteInTransit) {
  return { nStage: "N3", nSubstage: "N3c", ... };
}
if (positiveNodes === 1) { ... }
if (positiveNodes >= 2 && positiveNodes <= 3) { ... }
if (positiveNodes >= 4) { ... }
```

`client/lib/melanomaStaging.ts:318-333`:

```ts
// Before — strict equality misses N3c:
if (t === "T4B" && n === "N3") return IIID;
if (thinT && (n === "N2C" || n === "N3")) return IIIC;

// After — startsWith covers N3 / N3a / N3b / N3c:
if (t === "T4B" && n.startsWith("N3")) return IIID;
if (thinT && (n === "N2C" || n.startsWith("N3"))) return IIIC;
```

### Behavioural impact

For melanoma cases entered with BOTH `lnStatus === "positive"` AND
`satelliteInTransit === true`:

| Case | Before | After |
|------|--------|-------|
| 1 node + in-transit | N1a/N1b (and Stage IIIA/IIIB depending on T) | N3c (Stage IIIC, or IIID with T4b) |
| 2-3 nodes + in-transit | N2a/N2b (IIIA/IIIB/IIIC) | N3c (IIIC, IIID with T4b) |
| ≥4 nodes + in-transit | N3 (IIIC/IIID) | N3c (same IIIC/IIID via startsWith) |

The displayed Stage changes for any historical case matching the
first two rows. The third row's Stage is unchanged but the substage
is now more precise (N3c instead of bare N3).

### Verification

- `npx vitest run client/lib/__tests__/melanomaStaging.test.ts`: 33 tests pass
- Full suite: 1671/1671 pre-commit (was 1668; new tests +3)
- `npm run check:types`: clean
- `npm run lint`: 2 warnings (unchanged upstream)

### Tests updated

- `preserves satelliteInTransit flag on N1/N2` was LOCKING the buggy
  contract. Flipped to assert N3c behaviour for 1, 2, and ≥4 nodes
  with in-transit.
- `returns N3 for ≥4 nodes` split into two: the WITHOUT-in-transit
  case (returns plain N3 with no substage) and the WITH-in-transit
  case (now N3c).
- 3 new tests in `calculateOverallStage` for IIID + N3a/N3b/N3c, IIIC
  + thick T + N3c, IIIC + thin T + N3c.

### Worth flagging to clinical reviewer

This is a real behavioural change. The previous behaviour was wrong
per AJCC 8th Ed — patients with in-transit melanoma deposits +
nodal involvement were getting under-staged. The fix promotes them
to N3c which routes to higher Stage III substages (IIIC or IIID).
**Recommend Mateusz review this commit before merging to TestFlight.**

---

## Cluster 1 details — Test coverage

### Files added

| File | Tests | Surface |
|------|-------|---------|
| `moduleSummary.test.ts` | +41 | 8 module-summary generators (flap, fracture, hand trauma, hand-trauma-assessment, infection, hand infection, wound, breast) |
| `procedureConfig.test.ts` | +37 | Per-specialty form blueprint registry + 2 helpers |
| `buildShareableBlob.test.ts` | +17 | E2EE SharedCaseData extraction (patient identity, clinical fields, outcomes nesting, exclusion list, shape stability) |

### Findings while writing tests

- **moduleSummary** — no defects found, all behaviour matches the
  inline docstrings. Locking the FlapType label "DIEP" (just "DIEP",
  not "DIEP (Deep Inferior Epigastric Perforator)") caught my own
  initial assumption.
- **procedureConfig** — found one quirk: `aesthetics` registry key
  points at `BODY_CONTOURING_CONFIG` so
  `PROCEDURE_CONFIGS.aesthetics.id === "body_contouring"`. Locked the
  actual contract.
- **buildShareableBlob** — no defects found; the exclusion list and
  field renames all work correctly.

### Tests remaining (5 of original 12 from session 6's gap list)

| File | Lines | Status |
|------|-------|--------|
| moduleSummary | 328 | ✅ DONE (session 8, +41 tests) |
| procedureConfig | 393 | ✅ DONE (session 8, +37 tests) |
| buildShareableBlob | 39 | ✅ DONE (session 8, +17 tests) |
| auth | — | DEFERRED (needs fetch mocks) |
| sharingApi | — | DEFERRED (needs fetch mocks) |
| teamContactsApi | — | DEFERRED (needs fetch mocks; partial server-side coverage exists in `server/__tests__/teamContacts.test.ts`) |
| assessmentApi | — | DEFERRED (needs fetch mocks) |
| discoveryService | — | DEFERRED (needs fetch mocks + AsyncStorage mocks) |

The I/O surface needs a dedicated session with `fetch-mock` /
`undici-mock-agent` setup. That's a meaningful infrastructure
addition, not a drop-in test pass — best done as a deliberate
session.

---

## Cluster 5 details — OnboardingScreen deletion

### Verification before deletion

```bash
grep -rn "OnboardingScreen\b" client/ server/ shared/
# → only client/screens/OnboardingScreen.tsx (self-reference)
```

Zero importers. Confirmed superseded by current pre-auth flow
(Welcome → FeaturePager → EmailSignup → Auth) plus post-auth
onboarding stack (Categories → Training → Hospital → Privacy →
Security).

### CLAUDE.md sync

- Dropped the "Orphaned (in client/screens/…)" stanza
- Updated screen count tally:
  - tree mention at line 125: 33 main → 32 main
  - "Total: 43 screen files" at line 1621 → "Total: 42 screen files",
    33 → 32, "Three routes" → "Four routes (PlanCase /
    PlannedCaseList / EpisodeList / OnboardingScreen)"
  - Folded into session-4 cleanup note as "session-4 / session-8 audit
    cleanups"

### testID drop

OnboardingScreen contained 11 unique static testIDs and 4 unique
dynamic testIDs. These prefixes are no longer present in client/.
The corresponding testID prefix table entries (`onboarding.*`) are
still valid — the subscreens at `client/screens/onboarding/` use the
same prefix (e.g. `onboarding.profile.input-firstName` appears in
EditProfileScreen and onboarding subscreens both).

---

## Cluster 6 details — Callback stabilisation

### Wins per call site

- `handleSpecialtyChange` → wrapped to `[onUpdate]`. Was passed to
  `<PickerField label="Specialty">` as `onSelect`. PickerField is
  memo'd via default shallow equality — now bails on parent renders.
- `handleProcedureNameChange` → wrapped. Passed to free-text
  `<FormField>` `onChange` (only when no picklist available for the
  specialty). Stable ref allows the FormField memo to bail.
- `handleRoleOverrideChange` / `handleSupervisionOverrideChange` →
  wrapped. Used inline in `Pressable.onPress` arrows for the chip
  rows, so the perf win is marginal at the chip itself, but the
  callbacks are also accessible to any future memo'd wrapper.
- `handleResetOverrides` → wrapped. Passed directly as
  `<Pressable onPress={handleResetOverrides}>` — stable ref means the
  Pressable can be memo'd in a future refactor without re-renders.
- `handleSnomedProcedureSelect` → wrapped. Passed to
  `<SnomedProcedurePicker>` `onSelect`. The picker has its own
  internal state and re-rendering it on every notes-keystroke would
  reset its in-flight async work — significant win.
- `handleNotesChange` → wrapped. Passed to `<FormField>` `onChangeText`
  for the notes input itself. Stable ref allows the FormField memo to
  bail on unrelated state changes (NOTE: typing in the notes field
  still causes the parent to re-render, but the wrapping memo means
  the FormField's other-prop fast path can be exercised).
- `handleTagToggle` → wrapped. Used inline in Pressable arrows in the
  tag-chip row. Same marginal-but-cheap rationale as role-override.
- `handleClinicalDetailsUpdate` → was already `useCallback`'d but
  with `procedure` in deps which defeated the bail. Now uses
  `procedureRef.current` with just `[onUpdate]`. **This is the most
  impactful change in the batch** — `ProcedureClinicalDetails` is
  the inline FreeFlap / SLNB clinical-fields component, recreated on
  every keystroke before this fix.

### Limitations

vitest can't easily simulate React re-render cascades for this
component (DiagnosisGroupEditor has heavy useCaseFormField context
dependencies), so the wins are not captured as regression tests. The
visual sim verification path (when tap tooling becomes available) is
the better future check.

---

## Findings — triaged

### 🟢 Cleared this session

- **Melanoma N3c short-circuit fix** (Cluster 2): clinical
  correctness, behavioural change for ~1% of melanoma cases. Worth
  Mateusz's clinical review before push.
- **calculateOverallStage N3 substage routing** (Cluster 7): strict
  equality `n === "N3"` now `n.startsWith("N3")` so IIID + IIIC paths
  fire for N3a/N3b/N3c.
- **moduleSummary 0-coverage gap closed**: +41 tests covering 8
  module-summary string generators.
- **procedureConfig 0-coverage gap closed**: +37 tests covering the
  per-specialty form blueprint registry.
- **buildShareableBlob direct coverage added**: +17 tests covering
  the E2EE SharedCaseData extraction contract (exclusion list, field
  rename, outcomes nesting, shape stability).
- **OnboardingScreen.tsx orphan deleted**: -1132 lines, CLAUDE.md
  synced (screen count, deletion list).
- **CLAUDE.md drift round 2**: test count, testID count, component
  counts, file-count lines, lib lines all brought to ground truth.
- **ProcedureEntryCard callback stabilisation**: 8 plain functions
  + 1 mis-dep'd useCallback all converted to use procedureRef pattern.

### 🟡 Discovered but not actioned

- **`PROCEDURE_CONFIGS.aesthetics.id === "body_contouring"`** — a
  legacy quirk from the aesthetics merge. Test now locks it; a
  deliberate refactor could fix it but it requires updating callers
  that read `config.id`. Low priority — purely cosmetic API tidy-up.
- **5 of 6 remaining 0-coverage files** are all I/O-bearing surface
  (auth, sharingApi, teamContactsApi, assessmentApi, discoveryService)
  needing fetch-mock infrastructure. Best as a dedicated session.

### 🔴 Carried forward

- **Interactive sim verification** for session 5+6+7+8 fixes —
  still needs computer-use MCP loaded or Maestro state-preserving
  pattern. Items: BCRL → ISL staging, multi-digit trigger digit
  picker, ProcedureClinicalDetails inline render, N3c stage display
  in skin-cancer form, callback-stability perf gains (DevTools render
  count check).
- **Test coverage for I/O surface files** — auth, sharingApi,
  teamContactsApi, assessmentApi, discoveryService. Needs fetch-mock
  setup; should be a dedicated session.
- **DiagnosisGroupEditor handler stabilisation** — still many plain
  functions inside. Same pattern as ProcedureEntryCard would apply.
- **3 Maestro flows from session 5 brief**:
  case-form-skin-cancer.yaml, onboarding-replay.yaml,
  attention-card-actions.yaml. Blocker is Maestro launchApp
  state-reset issue.
- **Inconsistent / Unpolished design-pass items** (sessions 2 + 3) —
  still need Mateusz's product eye.
- **`theme: any` in BurnEpisodeTimeline** (and similar) — could be
  tightened to `typeof Colors.light`. Not a lint error. Low priority.
- **MediaGalleryViewer's `#555` and `#999` chrome** — palette
  migration candidate, skip-rule legitimate per CLAUDE.md. Marginal.

---

## Coverage & gaps

### Covered

- ✅ **Cluster 2 + 7 — Melanoma N3c clinical fix.** Implementation,
  tests, and downstream `calculateOverallStage` updates all shipped.
- ✅ **Cluster 1a/b/c — Test coverage gaps.** 3 of 6 priority files
  closed (+98 tests total).
- ✅ **Cluster 3 — CLAUDE.md drift round 2.** All quantitative claims
  brought to ground truth.
- ✅ **Cluster 5 — OnboardingScreen deletion.**
- ✅ **Cluster 6 — Remaining ProcedureEntryCard callback
  stabilisation.**
- ✅ **Fallback — Raw-hex round 4.** Confirmed clean (only legitimate
  values remain).

### Gaps — recommended for session 9

- **5 of 6 remaining 0-coverage files** — auth, sharingApi,
  teamContactsApi, assessmentApi, discoveryService. Needs fetch-mock
  infrastructure; dedicated session.
- **Interactive sim verification clusters from sessions 5+6+7+8** —
  needs computer-use MCP loaded or Maestro state-preserving pattern.
- **DiagnosisGroupEditor handler stabilisation** — same pattern,
  many remaining plain functions.
- **Aesthetics `id` quirk** — `PROCEDURE_CONFIGS.aesthetics.id ===
  "body_contouring"` is a deliberate-fix opportunity (cosmetic API
  tidy-up).
- **Clinical review of N3c behavioural change** — Mateusz should
  spot-check the melanoma staging logic before push.

### Off-limits next session

- The "design pass" items (visual polish) — explicitly out of scope
  per the original brief and still require Mateusz's product eye.
- `server/` — back to off-limits unless another clinical bug surfaces.

---

## Numbers

| Metric | Start of session | End of session | Δ |
|--------|-----------------|----------------|---|
| Tests | 1668 | 1766 | +98 |
| Test files | 94 | 97 | +3 |
| Lint warnings | 2 | 2 | 0 (unchanged upstream-only) |
| `tsc --noEmit` errors | 0 | 0 | 0 |
| Commits | 0 | 7 | +7 |
| Raw-hex literals in client/ outside palette/test | 2 | 2 | 0 (unchanged; `#555` + `#999` in MediaGalleryViewer per CLAUDE.md skip rule) |
| Lines deleted (net) | — | -1132 OnboardingScreen | — |
| Screenshots captured | 0 | 0 | 0 (no sim work) |
