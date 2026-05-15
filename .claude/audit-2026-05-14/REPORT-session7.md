# Opus visual + functional audit — 2026-05-16 (Session 7)

**Continuation of** `REPORT-session6.md` / `REPORT-session5.md` /
`REPORT-session4.md` / `REPORT-session3.md` / `REPORT-session2.md` /
`REPORT.md` / `NEXT-SESSION-PROMPT.md`. **App version under test:** 2.7.0
+ Phase 7.1 follow-ups + sessions 2–6 commits + this session's commits.
**Build flavour:** Source-level (clusters 1–3); sim-smoke for cluster 4.
**Tooling:** `npm run lint`, `npm run check:types`, `npx vitest run`,
plus `xcrun simctl` + `expo start --dev-client` for cluster 4.

---

## TL;DR

Session 7 picked up the priority list in `NEXT-SESSION-PROMPT.md` top-down.
All four priority clusters either landed or completed to the extent the
environment allowed.

- 🟢 **Cluster 1 — ProcedureEntryCard ref-based perf refactor** (1 commit
  `2e8135c`). Session 6 deferred this as "bigger surgical change than this
  session's scope". Two ref-based wins this session:
  1. `handlePicklistSelect` in `ProcedureEntryCard` was a plain function
     recreated on every render — defeating `ProcedureSubcategoryPicker.memo`
     (session 5 work). Now `useCallback`'d with deps `[diagnosisId,
     clinicalGroup, diagnosisLaterality, onUpdate, profile]` and reads
     the current procedure via `procedureRef.current`. Stable `onSelect`
     prop now lets the picker memo bail on unrelated parent renders.
  2. `removeProcedure` / `moveProcedureUp` / `moveProcedureDown` in
     `DiagnosisGroupEditor` were plain functions closing over the
     `procedures` array. Converted to `useCallback` with `[]` deps;
     `removeProcedure` reads via `proceduresRef.current`. Stable refs
     mean `CompactProcedureList.memo` (default shallow) bails when the
     procedures array is unchanged across unrelated parent renders.
  Plus API cleanup: `onDelete` / `onMoveUp` / `onMoveDown` on
  `ProcedureEntryCardProps` now receive the procedure id as their
  argument, so call sites pass parent-side useCallback'd functions
  directly instead of inline arrows. Internal Pressable handlers pass
  `procedure.id` through. Updated three call sites:
  - DiagnosisGroupEditor main map (line ~4128): inline arrows → stable refs.
  - DiagnosisGroupEditor custom-procedure block: inline arrow keeps its
    `setShowCustomProcedureEntry(false)` side effect but receives `id`
    from the prop instead of looking up via `procedures.length - 1`.
    `onMoveDown` changed from `() => {}` to `undefined` since
    `canMoveDown` is always `false` in this branch.
  - `BreastProgressiveAssessment` `draftCustomProcedure` block: `onDelete`
    passes `handleRemoveDraftProcedure` directly; `onMoveUp`/`Down` adapt
    the direction-bound `moveDraftProcedure` call.

  **Important nuance worth recording:** The brief's "with 4 procedures,
  every keystroke triggers 4 unnecessary re-renders" claim is *overstated*.
  ProcedureEntryCard has a CUSTOM React.memo equality function
  (`areProcedureEntryCardPropsEqual`, present since commit `96e8e1f`) that
  explicitly ignores function-prop identity. So inline-arrow callbacks
  never defeated the OUTER memo on cascading renders. The real wins this
  refactor unlocks are downstream: stabilising `handlePicklistSelect`
  reactivates the `ProcedureSubcategoryPicker.memo` for the
  procedure-entry path (was unstable, the only call site of three that
  passed an unstable onSelect), and the cleaner API enables future
  child-memo'd components to bail when added.
- 🟢 **Cluster 2 — Test coverage gaps** (1 commit `b9de5b4`). Closed 3 of
  the 6 remaining priority files from session 6's gap list. +54 tests
  net (1614 → 1668):
  - **melanomaStaging.test.ts (+30 tests).** AJCC 8th Ed T/N/Overall
    stage calculator + SLNB recommendation threshold. Locks boundary
    values (1.0→T1, 1.01→T2, 2.0→T2, 2.01→T3, 4.0→T3, 4.01→T4), substage
    rules (T1a/T1b/T2a/T2b ladder), the full Stage 0/IA/IB/IIA/IIB/IIC/
    IIIA/IIIB/IIIC/IIID/IV ladder, satellite/in-transit handling, and
    the 0.8mm SLNB threshold. Notably **also locks a known
    short-circuit quirk** discovered while writing the tests: 1-node
    + `satelliteInTransit:true` returns N1a/N1b (NOT N3) because the
    `positiveNodes === 1` branch returns before the `OR satelliteInTransit`
    check fires. The implementation isn't strictly AJCC-compliant for
    that edge case (N3c is supposed to capture ≥2 N + in-transit), but
    rather than fix it silently I locked the actual contract. Flagged
    in coverage section below as a potential future fix.
  - **episodeHelpers.test.ts (+12 tests).** `suggestEpisodeType` +
    `suggestEpisodeTitle`. Covers exact subcategory match, whitespace/
    hyphen normalisation, partial match fallback, specialty fallback,
    `"other"` default. Title tests cover laterality prefix
    (L/R/Bilat/midline), `"management"` auto-append, suffix preservation
    (already-implies-management cases), parenthetical + trailing-comma
    stripping.
  - **handElectiveFlow.test.ts (+12 tests).** `isElectiveHandFlow`
    predicate (locks elective-only gate), `shouldRenderGenericDiagnosisSnomedPicker`
    (4 truthiness inputs), `buildElectiveSnomedFallbackState` (full
    shape verification, ref-passthrough contract for procedures, Set
    isolation per call).
- 🟢 **Cluster 3 — CLAUDE.md App Screen Map cleanup** (1 commit `88a0582`).
  Session 6 added a footnote naming the screens missing from the table;
  this finished the job by adding actual rows:
  - 5 push-presentation rows for `Assessment` / `AssessmentHistory` /
    `AssessmentReveal` / `SharedCaseDetail` / `SharedInbox` (Team
    Sharing Phase 4 + E2EE receiver surfaces).
  - 1 explicit "orphaned" entry for `OnboardingScreen.tsx`
    (`screen-onboarding`) — verified by `grep` over `client/` and
    `client/navigation/` that NO navigator imports it. Marked eligible
    for deletion in a future cleanup pass.
  - Replaced the stale "Not enumerated…" paragraph with a Phase-4
    context note now that the table is self-contained.
  - **testID scope prefix table refresh**: added 9 prefixes present in
    `client/` but not previously documented: `caseSearch`, `welcome`,
    `media`, `mediaGallery`, `teamContact`, `teamContacts`, `assessment`,
    `assessmentReveal`, `sharedCaseDetail`. All examples spot-checked
    against actual usage. **Removed `episodes.*`** — no longer present
    in the codebase (`EpisodeList` was deleted in session 4; surviving
    `episodeDetail.*` separately documented). Annotated the `main.*`
    row noting these are `tabBarButtonTestID` props (set on Tab.Screen
    options) rather than React-Native `testID` props.
- 🟡 **Cluster 4 — Sim smoke test** (no commits — environment-bounded).
  Sim was healthy (iPhone 17 / iOS 26.4, UDID
  `6AF34D12-7A59-439E-A861-768C5578B00A`). Booted clean from shutdown;
  CoreSimulatorService was healthy this session (not the `-9` failure
  state from session 6). Successfully started Metro on port 8081, ran a
  full bundle (3752 modules / 24s), and launched Opus. Confirmed:
  - **Cluster 1 refactor does not crash the app at boot** — dashboard
    renders cleanly post-bundle. Critical smoke test for the procedure-
    callback refactor.
  - **Debug deep links still work**: `opus://debug/login` signs in as
    `m.gladysz@outlook.com`; `opus://debug/seed` populates 22 cases +
    1 episode (confirmed via Metro logs and via the dashboard's `All
    (22)` filter chip after restart).
  - **Dashboard renders all 22 seeded cases correctly**: filter chips
    show All (22) / Breast (4) / Hand & Wrist (4) / Skin Cancer (...);
    Needs Attention card shows Priya Anand POD 2 Breast cancer (DIEP
    flap) with Event / Discharge / Log Case quick actions; Practice
    Pulse shows 5 this month / 2 this week / 93% completion; Recent
    Cases shows DIEP flap breast reconstruction with "1st Asst" role
    badge. Screenshot: `s7-dashboard-loaded.png`.
  - **What I could NOT verify** without interactive tap tooling
    (computer-use MCP not loaded in this environment; Maestro 2.5.1
    `launchApp` clears app state and was unhelpful for "log in then
    assert" flows; text-based selectors hit em-dash matching issues on
    the case-card "Breast cancer — invasive" subtitle):
    - BCRL staging fix (session 5) requires navigating into case form
      → Lymphoedema → BCRL → confirm staging block reads "ISL Stage".
    - Multi-digit trigger digit picker (session 6) requires Hand
      surgery → elective → Stenosing Tenosynovitis → Trigger finger /
      thumb → confirm DigitMultiSelect with 5 chips renders.
    - ProcedureClinicalDetails inline render path (session 6 memo
      wrap) requires a free flap case detail or edit view.
  All three interactive verifications remain **carried forward to a
  future session** that has tap tooling available (Maestro flows that
  don't `launchApp`-reset state, or the Expo MCP automation_* tools).
  Cluster 1's boot-survival check is the most important smoke for this
  session's changes and is satisfied.
- 🟡 **Clusters 5 + 6 — Maestro flow extensions / deep specialty
  captures** — same blocker as Cluster 4 (no interactive tap tooling
  for "log in" → "navigate to specific surface" patterns inside Opus
  that survive a `launchApp` reset). Skipped per the brief's
  "sim-dependent / OPTIONAL" framing. Recommended for session 8 if
  computer-use MCP is loaded or a Maestro pattern that preserves
  AsyncStorage state across `launchApp` is established.

**Commits this session: 3.** Tests went 1614 → 1668 (+54). Lint warnings
unchanged at 2 (both upstream import/no-named-as-default). `tsc --noEmit`
clean throughout. 11 screenshots captured to
`.claude/audit-2026-05-14/screenshots/s7-*.png` documenting the cluster-4
boot smoke test.

---

## Commits landed this session

| Commit | Summary |
|--------|---------|
| [`2e8135c`](https://github.com/dummy/sha/2e8135c) | Stabilise procedure-mutation callbacks via ref pattern (ProcedureEntryCard handlePicklistSelect + DiagnosisGroupEditor removeProcedure/moveProcedureUp/moveProcedureDown) |
| [`b9de5b4`](https://github.com/dummy/sha/b9de5b4) | Close 3 more test coverage gaps (melanoma staging / episode helpers / hand elective flow) |
| [`88a0582`](https://github.com/dummy/sha/88a0582) | CLAUDE.md: enumerate 6 missing screens in App Screen Map, refresh testID prefixes |

---

## Cluster 1 details — ref-based perf refactor

### Investigation

Before applying the refactor I read both files end-to-end to verify the
brief's claim. **Found one important nuance the brief glossed over:**
`ProcedureEntryCard` has a custom React.memo equality function in
`areProcedureEntryCardPropsEqual` (`ProcedureEntryCard.tsx:690`) that
explicitly compares only data props (`procedure`, `index`, `isOnlyProcedure`,
`canMoveUp`, `canMoveDown`, `diagnosisId`, `clinicalGroup`,
`diagnosisLaterality`) and IGNORES the function props `onUpdate` /
`onDelete` / `onMoveUp` / `onMoveDown`. So the brief's "every keystroke
in ANY procedure rebuilds these 3 inline arrows for every other procedure
card, defeating the memo" is **factually wrong about that specific memo**
— the memo correctly bails regardless of inline arrows.

But the refactor still has real value, just not the value the brief
described:

1. **`ProcedureSubcategoryPicker.memo` (session 5 work, default shallow
   equality) is real and DOES check function-prop identity.** The
   picker is called from three call sites: AestheticProcedureFirstFlow
   passed a `useCallback`-wrapped onSelect (memo bails — session 5 verified);
   BreastProgressiveAssessment passed an inline arrow (session 6 fixed
   with `handlePicklistEntrySelect = useCallback`); ProcedureEntryCard
   passed `handlePicklistSelect` which was a plain function (this
   session — fixed now). This is the dominant per-keystroke win.
2. **`CompactProcedureList.memo` (default shallow)** at
   `DiagnosisGroupEditor.tsx:~4018` similarly checks function-prop
   identity for `onMoveUp` / `onMoveDown`. With those now stable refs,
   the list memo bails when only unrelated state changes.
3. **Cleaner API** — `onDelete(id)` is more honest than `onDelete()`
   with a closure-captured id, and removes the per-procedure-per-parent-
   render inline-arrow allocations.

### Implementation

`client/components/ProcedureEntryCard.tsx`:

```tsx
// Before
import React, { useCallback, useMemo, useState } from "react";
// ...
interface ProcedureEntryCardProps {
  // ...
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  // ...
}
// ...
const handlePicklistSelect = (entry: ProcedurePicklistEntry) => {
  /* reads `procedure` in 4 places, ends with onUpdate({ ...procedure, ... }) */
};
// internal: onPress={() => onMoveUp?.()}

// After
import React, { useCallback, useMemo, useRef, useState } from "react";
// ...
interface ProcedureEntryCardProps {
  // ...
  onDelete: (procedureId: string) => void;
  onMoveUp?: (procedureId: string) => void;
  onMoveDown?: (procedureId: string) => void;
  // ...
}
// ...
const procedureRef = useRef(procedure);
procedureRef.current = procedure;
// ...
const handlePicklistSelect = useCallback(
  (entry: ProcedurePicklistEntry) => {
    const current = procedureRef.current;
    /* same body but reads `current` everywhere `procedure` was used */
  },
  [diagnosisId, clinicalGroup, diagnosisLaterality, onUpdate, profile],
);
// internal: onPress={() => onMoveUp?.(procedure.id)}
```

`client/components/DiagnosisGroupEditor.tsx`:

```tsx
// Before
const [procedures, setProcedures] = useState<CaseProcedure[]>(group.procedures);
// ...
const removeProcedure = (id: string) => {
  const target = procedures.find((p) => p.id === id);
  // ...
};
const moveProcedureUp = (id: string) => { /* setProcedures functional */ };
const moveProcedureDown = (id: string) => { /* setProcedures functional */ };

// After
const [procedures, setProcedures] = useState<CaseProcedure[]>(group.procedures);
const proceduresRef = useRef(procedures);
proceduresRef.current = procedures;
// ...
const removeProcedure = useCallback((id: string) => {
  const target = proceduresRef.current.find((p) => p.id === id);
  /* rest unchanged */
}, []);
const moveProcedureUp = useCallback((id: string) => { /* unchanged */ }, []);
const moveProcedureDown = useCallback((id: string) => { /* unchanged */ }, []);
```

Call sites updated:
- `DiagnosisGroupEditor.tsx:4128+`: inline arrows → stable refs:
  `onDelete={removeProcedure}`, `onMoveUp={moveProcedureUp}`,
  `onMoveDown={moveProcedureDown}`.
- `DiagnosisGroupEditor.tsx:4044+` (custom-procedure block): kept an
  inline arrow for `onDelete` because it has a `setShowCustomProcedureEntry(false)`
  side effect, but the arrow now takes id from the prop. `onMoveDown`
  changed from `() => {}` to `undefined`.
- `BreastProgressiveAssessment.tsx:1513+`: `onDelete={handleRemoveDraftProcedure}`
  (direct stable ref); `onMoveUp={(id) => moveDraftProcedure(id, -1)}` /
  `onMoveDown={(id) => moveDraftProcedure(id, 1)}` (direction-bound
  adapters).

### Verification

- `npm run check:types`: clean
- `npm run lint`: 2 warnings (unchanged, both upstream)
- `npx vitest run`: 1614/1614 across 91 files (no change from refactor)
- Sim smoke test (Cluster 4): app boots clean post-refactor, dashboard
  renders 22 seeded cases without errors.

### Deferred

- Adding regression-prone behavior tests for the procedure-callback
  refactor — vitest can't easily simulate React re-render cascades
  without React Testing Library wiring that isn't set up for this
  component (DiagnosisGroupEditor has heavy useCaseFormField context
  dependencies). Visual sim verification via tap tooling (when
  available) is the better path here.

---

## Cluster 2 details — test coverage

### Files added

| File | Tests | Surface | Notes |
|------|-------|---------|-------|
| `melanomaStaging.test.ts` | +30 | AJCC 8th Ed T/N/Overall stage + SLNB threshold | Locks a known short-circuit quirk in N1 + satelliteInTransit handling. See "Finding" below. |
| `episodeHelpers.test.ts` | +12 | `suggestEpisodeType`, `suggestEpisodeTitle` | Pure logic |
| `handElectiveFlow.test.ts` | +12 | `isElectiveHandFlow`, `shouldRenderGenericDiagnosisSnomedPicker`, `buildElectiveSnomedFallbackState` | Pure logic |

### Finding — melanoma N3c short-circuit

While writing tests for `calculateNStage` I discovered the implementation
doesn't quite match AJCC 8th Ed for one edge case:

```ts
// client/lib/melanomaStaging.ts:160-202
if (lnStatus === "positive") {
  if (positiveNodes === 1) {
    // returns N1a/N1b — BUT the satelliteInTransit flag is recorded only
    // as `hasSatelliteInTransit: true` on the result, not in nSubstage.
  }
  if (positiveNodes >= 2 && positiveNodes <= 3) {
    // returns N2a/N2b — same: satellite flag preserved but not in nSubstage.
  }
  if (positiveNodes >= 4 || (positiveNodes >= 1 && satelliteInTransit)) {
    // returns N3 — but `positiveNodes >= 1 && satelliteInTransit` is
    // dead code because the earlier `=== 1` and `2-3` branches already
    // returned.
  }
}
```

Per AJCC 8th Ed, ≥2 nodes + in-transit metastases should be N3c. The
current implementation locks the satellite info into a separate
`hasSatelliteInTransit` boolean but doesn't promote nSubstage to N3c.

I locked the actual contract in tests rather than fix the implementation
silently — fixing it should be a separate, deliberate clinical-correctness
PR that the user reviews. Logged here so the next session can pick it up.

### Tests remaining (carried forward)

Session 6 listed 12 files with 0 test coverage. Session 6 closed 4
(moduleVisibility, caseNormalization, caseDiagnosisSummary, seniorityTier).
This session closed 3 (melanomaStaging, episodeHelpers, handElectiveFlow).
Remaining (5 of original 12):

- moduleSummary (328 lines) — mostly display strings
- procedureConfig (393 lines) — procedure metadata
- buildShareableBlob (39 lines) — has indirect coverage via
  sharingBridge.test.ts; low priority
- I/O surface: auth, sharingApi, teamContactsApi, assessmentApi,
  discoveryService — all require fetch mocks; should be a dedicated
  session

---

## Cluster 3 details — CLAUDE.md cleanup

### Methodology

1. Listed every screen file under `client/screens/` against the
   App Screen Map table.
2. Grepped each missing screen for testID and presentation
   (`grep -n 'testID="screen-' client/screens/<Name>.tsx`).
3. Confirmed each screen's navigator registration
   (`grep "ScreenName\|component={ScreenName}" client/navigation/`).
4. For `OnboardingScreen` specifically: `grep -rn 'OnboardingScreen' client/ server/ shared/` to confirm zero importers.
5. For testID prefixes: `grep -roh 'testID="[a-zA-Z]*\.' client/ | sort -u`
   gives the comprehensive list of all currently-used prefixes. Cross-
   referenced against the docs table; found 9 missing + 1 stale.
6. For each new prefix: pulled 5-10 real examples via
   `grep -rohE '"<prefix>\.[^"]+"' client/ | sort -u` to verify the
   sample examples chosen for the docs table are accurate.

### Findings

- **OnboardingScreen.tsx is orphaned.** No navigator imports it. It's a
  fully-formed 4-step (agreement → country → career → facilities) flow
  but superseded by the current pre-auth Welcome/FeaturePager/EmailSignup/
  Auth chain plus the post-auth 5-step Categories/Training/Hospital/
  Privacy/Security onboarding. Eligible for deletion in a future cleanup
  pass parallel to the session-4 PlanCase / PlannedCaseList / EpisodeList
  sweep. **Logged inline in CLAUDE.md** as "orphaned" rather than
  deleted this session — deletion should be a deliberate cleanup pass
  the user reviews.
- **`episodes.*` testID prefix is dead** — no longer present anywhere in
  `client/`. Removed from the docs table.
- **`main.*` testID prefix is documented incorrectly.** These are
  `tabBarButtonTestID` props on Tab.Screen options, not React-Native
  `testID` props. A `grep 'testID="main\.'` returns nothing — which
  would mislead an auditor. Annotated.

### testID prefix table — all examples verified

| New prefix | Real examples sampled |
|------------|----------------------|
| `caseSearch.*` | `caseSearch.input-search`, `caseSearch.btn-clear` |
| `welcome.*` | `welcome.btn-getStarted`, `welcome.btn-signIn` |
| `media.*` | `media.add.btn-confirm`, `media.management.btn-openPreview` |
| `mediaGallery.*` | `mediaGallery.btn-close`, `mediaGallery.btn-share`, `mediaGallery.counter` |
| `teamContact.*` | `teamContact.input-firstName`, `teamContact.btn-save` |
| `teamContacts.*` | `teamContacts.btn-add` |
| `assessment.*` | `assessment.btn-submit`, `assessment.input-narrative` |
| `assessmentReveal.*` | `assessmentReveal.entrustment-supervisor`, `assessmentReveal.teaching-quality` |
| `sharedCaseDetail.*` | `sharedCaseDetail.btn-verify`, `sharedCaseDetail.btn-dispute` |

---

## Cluster 4 details — sim smoke test

### Environment

- Sim: iPhone 17 / iOS 26.4 / UDID `6AF34D12-7A59-439E-A861-768C5578B00A`
- Boot state at session start: Shutdown
- Boot result: clean (no CoreSimulatorService -9 failure from session 6)
- Metro port: 8081 (default; attempt on port 8085 failed because the
  dev client looks for the URL via its standard discovery path)
- Bundle: 3752 modules, 23984ms first build

### Smoke test outcome

| Check | Result | Screenshot |
|-------|--------|------------|
| App boots without crash after Cluster 1 refactor | ✅ | `s7-launch2.png` (bundling 75%) → `s7-bundled.png` (auth screen) |
| Debug login deep link (`opus://debug/login`) works | ✅ | Metro log: `[DevDeepLink] signed in as m.gladysz@outlook.com` |
| Debug seed deep link (`opus://debug/seed`) works | ✅ | Metro log: `[DevDeepLink] seeded 22 cases + 1 episode(s)` |
| Dashboard renders 22 seeded cases | ✅ | `s7-dashboard-loaded.png` shows All (22), Needs Attention, Practice Pulse 5/2/93%, Recent Cases |
| FAB / tab bar / specialty filter chips render | ✅ | Same screenshot |
| ProcedureEntryCard refactor doesn't crash on case load | ✅ inferred — recent case "DIEP flap breast reconstruction" subtitle renders; no error overlay in screenshot | Same screenshot |

### Items NOT verified (carried forward to session 8 if tap tooling available)

| Item | Source-level commit | Why not verified this session |
|------|--------------------|-------------------------------|
| BCRL → ISL staging (session 5 commit `5706471`) | Server-side fix already verified by 7 regression-guard tests + existing client snomedstaging tests | No tap tooling to navigate Lymphoedema → BCRL form. |
| Multi-digit Trigger digit picker (session 6 commit `e2dd8e8`) | 4 regression-guard tests in `handElective.test.ts` | No tap tooling to navigate Hand surgery → Elective → Stenosing Tenosynovitis → Trigger finger. |
| ProcedureClinicalDetails memo + stable props (session 6 commit `088e5e5`) | Render-path well-covered indirectly; this session's Cluster 1 reinforces stability | No tap tooling to navigate into a free-flap case detail. |

### Maestro 2.5.1 lessons (carry-forward)

- `launchApp` clears app state (login, AsyncStorage). After login via
  `opus://debug/login` deep link, a subsequent Maestro flow that uses
  `launchApp` resets to the auth screen. The pattern "log in via deep
  link, then run Maestro flow to navigate" doesn't work as-is. Either
  (a) the deep links need to also be exposed as Maestro `openLink`
  steps inside the flow, or (b) `clearState: false` (if supported)
  needs to be set.
- `tapOn: { text: "Breast cancer — invasive" }` failed even when the
  text was visible — likely the en-dash/em-dash character is being
  mismatched against the regex normalisation Maestro does. Use `id:`
  selectors (testIDs) instead for any future Maestro flow targeting
  case-card titles.

---

## Findings — triaged

### 🟢 Cleared this session

- **ProcedureEntryCard ref-based perf refactor** — handlePicklistSelect
  + removeProcedure/moveProcedureUp/moveProcedureDown all stabilised.
  Three call sites updated. tsc + lint + tests green.
- **3 more 0-coverage lib files closed** — melanomaStaging,
  episodeHelpers, handElectiveFlow. +54 tests.
- **CLAUDE.md App Screen Map table self-contained** — 6 missing screens
  added (including 1 orphaned annotation); 9 new testID prefixes
  documented; 1 stale prefix removed.
- **Sim smoke verified Cluster 1 refactor doesn't crash app at boot.**

### 🟡 Discovered but not actioned

- **`OnboardingScreen.tsx` is orphaned dead code.** Logged in CLAUDE.md
  as eligible for deletion in a future cleanup pass parallel to session 4
  PlanCase/PlannedCaseList/EpisodeList sweep. NOT deleted this session
  to keep the cleanup deliberate.
- **`melanomaStaging.calculateNStage` doesn't match AJCC 8th Ed for the
  "≥2 nodes + in-transit metastases → N3c" edge case** (dead code in the
  third conditional). Test now locks the actual contract. Implementation
  fix should be a separate clinical-correctness PR the user reviews.

### 🔴 Carried forward

- **ProcedureClinicalDetails / ProcedureEntryCard internal callback
  stabilisation gaps** beyond this session — `handleProcedureNameChange`,
  `handleNotesChange`, `handleSpecialtyChange`, `handleRoleOverrideChange`,
  `handleSupervisionOverrideChange`, `handleResetOverrides`,
  `handleSnomedProcedureSelect`, `handleTagToggle` are all still plain
  functions recreated on each render. Each is used as an `onPress` /
  `onValueChange` for memo'd components (FormField, PickerField, etc.).
  Marginal wins individually; could be batched.
- **5 of 6 remaining 0-coverage lib files**: moduleSummary,
  procedureConfig, buildShareableBlob (low priority — indirect coverage
  exists), and the I/O surface (auth, sharingApi, teamContactsApi,
  assessmentApi, discoveryService).
- **Interactive sim verification for session 5 + 6 fixes** — needs
  computer-use MCP tools loaded, or a Maestro pattern that preserves
  AsyncStorage state across `launchApp`.
- **3 Maestro flows from session 5 brief**:
  case-form-skin-cancer.yaml, onboarding-replay.yaml,
  attention-card-actions.yaml. Blocker is the same Maestro launchApp
  state-reset issue documented above.
- **Inconsistent / Unpolished design-pass items** (sessions 2 + 3) —
  still need Mateusz's product eye.
- **`theme: any` in BurnEpisodeTimeline** (and similar) — could be
  tightened to `typeof Colors.light`. Not a lint error. Low priority.
- **MediaGalleryViewer's `#555` and `#999` chrome** — palette migration
  candidate, skip-rule legitimate. Marginal.

---

## Coverage & gaps

### Covered

- ✅ **Cluster 1 — ProcedureEntryCard ref-based perf refactor.** All
  three call sites updated. tsc + lint + tests green. Sim smoke verifies
  boot survival.
- ✅ **Cluster 2 — Test coverage gaps.** 3 of 6 priority files closed
  (+54 tests).
- ✅ **Cluster 3 — CLAUDE.md cleanup.** 6 screens added; 9 testID
  prefixes added; 1 stale prefix removed.
- ✅ **Cluster 4 — Sim smoke test** (boot survival + dashboard render
  + seed deep link work). Interactive verifications carried forward.

### Gaps — recommended for session 8

- **5 of 6 remaining 0-coverage lib files** — moduleSummary,
  procedureConfig, buildShareableBlob (low pri), plus the I/O surface
  files. The I/O surface needs a dedicated session with fetch-mock
  setup.
- **Melanoma N3c short-circuit fix** — separate clinical-correctness PR.
- **Interactive sim verification clusters from sessions 5+6+7** — needs
  computer-use MCP loaded or Maestro state-preserving pattern.
- **OnboardingScreen.tsx deletion decision** — currently flagged but
  not deleted.
- **More procedure-card internal callback stabilisation** —
  handleProcedureNameChange / handleNotesChange / etc.

### Off-limits next session

- The "design pass" items (visual polish) — explicitly out of scope per
  the original brief and still require Mateusz's product eye.
- `server/` — back to off-limits unless another clinical bug surfaces.

---

## Numbers

| Metric | Start of session | End of session | Δ |
|--------|-----------------|----------------|---|
| Tests | 1614 | 1668 | +54 |
| Test files | 91 | 94 | +3 |
| Lint warnings | 2 | 2 | 0 (unchanged upstream-only) |
| `tsc --noEmit` errors | 0 | 0 | 0 |
| Commits | 0 | 3 | +3 |
| Raw-hex literals in client/ | 10 | 10 | 0 (unchanged) |
| Screenshots captured | 0 | 3 | +3 (cluster 4 sim journey — pruned to the 3 referenced in this report; intermediate-state screenshots removed) |
