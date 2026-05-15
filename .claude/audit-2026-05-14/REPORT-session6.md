# Opus visual + functional audit — 2026-05-16 (Session 6)

**Continuation of** `REPORT-session5.md` / `REPORT-session4.md` /
`REPORT-session3.md` / `REPORT-session2.md` / `REPORT.md` /
`NEXT-SESSION-PROMPT.md`. **App version under test:** 2.7.0 + Phase 7.1
follow-ups + sessions 2–5 commits + this session's commits. **Build
flavour:** Source-level only — no sim driving this session.
**Tooling:** `npm run lint`, `npm run check:types`, `npx vitest run`.

---

## TL;DR

Session 6 is the **follow-up + verification + raw-hex finish** pass the
brief described. Worked the priority list top-down through Clusters 1–6;
deferred 7–9 (sim-dependent) per the brief's "skip if sim isn't healthy"
guidance — the simulator wasn't booted at session start and I didn't burn
time reviving it.

- 🟢 **Cluster 1 — Session 5 self-review** (no commits). Walked all 7
  session-5 commits with fresh eyes. Found one cosmetic-but-harmless
  artefact: the array-type lint auto-fix in commit `bced1b3` stripped
  several `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
  comments BUT the underlying `theme: any` types are still present
  (lint config doesn't enforce `no-explicit-any`). Not a regression — the
  session 5 claim "explicit-any: 8 → 0" was about the auto-fixer
  removing the now-unnecessary disable directives, not about the `any`
  types themselves. The 8 pre-existing `any` types in BurnEpisodeTimeline
  remain unchanged and unflagged (they exist for a hand-written `theme: any`
  parameter pattern, not a real rule violation). All 7 session 5 commits
  verified sound.
- 🟢 **Cluster 2 — Raw-hex round 3** (2 commits: `54313d4`, `69a1c3c`).
  Activated the dormant `client/theme/tokens.ts` onboarding token system
  — the file existed with "LOCKED" comment + "every onboarding component
  references these names" claim, but no file imported it. Activated as
  intended across 10 onboarding screens (HospitalScreen, EmailSignup,
  Security, Training, FeaturePager, Auth, Categories, Privacy, Welcome,
  FeatureSlide). Then swept the remaining cross-codebase hex: shadow
  colours (`shadowColor: "#000"`), brand amber on context (OpusMark /
  OpusLogo / histology-pending banner), pure-white-on-photo overlay
  constants, Android Switch thumb colours (9 components × 16 instances),
  App.tsx privacy overlay charcoal bg, aestheticsConfig INTENT_COLORS.
  **Raw-hex literals in `client/`: 132 → 10** (target was <50). The
  remaining 10 are all legitimate per CLAUDE.md skip rules: 8 in
  `lib/exportPdfHtml.ts` (CSS in HTML template string, not RN styles)
  and 2 in `MediaGalleryViewer.tsx` (`#555`/`#999` chrome on always-black
  immersive viewer).
- 🟢 **Cluster 3 — handleMultiDigitConfirm decision** (1 commit: `e2dd8e8`).
  The lone remaining no-unused-vars warning from session 5 was actually a
  half-shipped feature, not abandoned code. State plumbing in
  DiagnosisGroupEditor (pendingMultiDigitDiagnosis, selectedDigits,
  handleMultiDigitConfirm) was complete; HandElectiveAssessment exposed
  matching optional props; but the call site never passed them. Surgeons
  selecting "Trigger finger / thumb" set the pending state but never
  saw the DigitMultiSelect. **Wire-up: 4-line prop pass-through**, plus
  4 regression-guard tests in `handElective.test.ts`. Lint warnings:
  3 → 2 (last client warning closed; remaining 2 are upstream
  `import/no-named-as-default` from npm packages we can't fix).
- 🟢 **Cluster 4 — Additional perf opportunities** (1 commit: `088e5e5`).
  Two new wins beyond session 5's audit:
  1. ProcedureClinicalDetails (1700-line specialty-dispatched body) was
     unmemoized AND called with two unstable props (`clinicalDetails={x || {}}`
     creates new `{}` per render; `onUpdate` was a plain function).
     Wrapped: React.memo on ProcedureClinicalDetails; `clinicalDetailsRef`
     useMemo + `handleClinicalDetailsUpdate` useCallback in
     ProcedureEntryCard. Both call-site props now stable.
  2. BreastProgressiveAssessment's ProcedureSubcategoryPicker `onSelect`
     was an inline arrow that adapted entry-object → id-string for
     handleAddPicklistProcedure. Extracted to `handlePicklistEntrySelect`
     useCallback. The ProcedureSubcategoryPicker.memo (session 5) now
     actually bails on this call site.
  Documented but **deferred** to next session: ProcedureEntryCard's
  removeProcedure / moveProcedureUp / moveProcedureDown are plain
  functions closing over `procedures` array — would need `proceduresRef`
  ref pattern to stabilise across procedure-array mutations. Real perf
  win but bigger surgical change than this session's scope.
- 🟢 **Cluster 5 — Test coverage gap audit** (1 commit: `60b093e`).
  Identified 12 lib files with 0 test coverage. Closed the 4 highest-value
  gaps with smoke tests (+69 tests total):
  - **moduleVisibility.test.ts (+32 tests)** — getModuleVisibility is the
    single function gating all specialty modules. Bugs here = wrong module
    for wrong diagnosis. Covers all 11 specialty activations, 3 case-level
    flap predicates, hand trauma case-type gate, burns acute-only
    specificity, existing-data fallback for re-edits, infection
    first-group-only semantics.
  - **caseNormalization.test.ts (+8 tests)** — runs on every save. Covers
    identity short-circuit, ISO→YYYY-MM-DD repair, skin cancer histology
    dates (prior + current, group + lesion levels).
  - **caseDiagnosisSummary.test.ts (+8 tests)** — 25+ surfaces depend on
    this for dashboard cards, case detail headers, summary panels.
  - **seniorityTier.test.ts (+21 tests)** — EPA derivation depends on tier
    mapping. Covers all 6 countries, legacy backward-compat values,
    isSeniorTo ladder, cross-country comparison.
- 🟢 **Cluster 6 — CLAUDE.md drift audit** (1 commit: `21c6fe4`). Fixed
  6 stale claims:
  - Screen count: "36 (27 + 9)" → "43 (33 + 10)" with footnote
    enumerating 6 screens missing from the App Screen Map
    (AssessmentScreen, AssessmentHistoryScreen, AssessmentRevealScreen,
    SharedCaseDetailScreen, SharedInboxScreen, OnboardingScreen).
  - Hand Surgery diagnoses: 103 → 106. Orthoplastic: 14 → 16. Total:
    481 → 477. Plus a 286→477 fix on line 271 with cross-ref to the
    inventory table.
  - Staging configs: "14 configs" → "21 SNOMED-keyed configs surfacing
    29 individual staging systems". The standalone "17 systems" claim →
    "29 staging systems".
  - Tests: "1540 across 87 files" → "1614 across 91 files" with
    per-session trail.
  - testIDs: "193 unique static + 94 unique dynamic = 287 total" →
    "269 unique static + 127 unique dynamic patterns = 396 unique
    (288 raw static-string definitions; 420 total testID prop usages)".

**Commits this session: 6.** Tests went 1541 → 1614 (+73 net: +4 multi-digit
+ +69 lib coverage). Lint warnings went 3 → 2 (the lone client warning
closed). `tsc --noEmit` clean throughout. Raw-hex went 132 → 10.

---

## Commits landed this session

| Commit | Summary |
|--------|---------|
| [`54313d4`](https://github.com/dummy/sha/54313d4) | Raw-hex round 3a: activate dormant onboarding token system |
| [`69a1c3c`](https://github.com/dummy/sha/69a1c3c) | Raw-hex round 3b: migrate shadow / brand / pure black-white / intent colours |
| [`e2dd8e8`](https://github.com/dummy/sha/e2dd8e8) | Wire up multi-digit trigger digit confirm flow (closes half-shipped feature) |
| [`088e5e5`](https://github.com/dummy/sha/088e5e5) | Stabilise ProcedureClinicalDetails props + memo wrap, fix breast picker handler |
| [`60b093e`](https://github.com/dummy/sha/60b093e) | Close test-coverage gaps for module visibility / case normalization / seniority |
| [`21c6fe4`](https://github.com/dummy/sha/21c6fe4) | CLAUDE.md drift fixes: screen counts, diagnosis totals, testIDs, staging |

---

## Cluster 1 — Session 5 self-review (no commits)

### What I verified

For each of the 7 session-5 commits, I read the message + diff with fresh
eyes and checked one specific risk.

**`5706471` BCRL fix.** Cross-referenced client lymphoedema SNOMED codes
against the ISL config's `snomedCtCodes` array. Found 4 client codes NOT
in the ISL list: `234095009` (Lymphatic malformation), `83035003`
(Chylothorax), `52985009` (Chylous ascites), `26929004` (Alzheimer's
glymphatic). Investigated each — all have `hasStaging: false` in the
client picklist, so the server correctly returning `null` (because they
don't match the ISL keywords either) is the intended contract.
**Session 5 commit verified clean.**

**`513bc18` PlanCase cleanup.** Grepped for any indirect callers of
`getPlannedCases` / `getPlannedCaseCount` across client/server/shared.
Only references are in `.claude/worktrees/*` (separate working copies
unrelated to the main repo). **Session 5 commit verified clean.**

**`d5e2796` memoize pickers.** Re-walked each call site and traced
prop-stability deps:
- `DiagnosisPicker` call sites pass `handleDiagnosisSelect` which is
  `useCallback([groupSpecialty, buildDefaultProcedures,
  buildFreeFlapClinicalDetails])`. `groupSpecialty` is local state
  (stable across same-specialty work). Both build* helpers are
  `useCallback`-wrapped with stable deps. **Win confirmed.**
- `HandElectivePicker` call site is HandElectiveAssessment, which is
  itself called from DiagnosisGroupEditor passing `handleDiagnosisSelect`
  (stable). Within HandElectiveAssessment, `handleDiagnosisSelect` is
  `useCallback([onDiagnosisSelect, setSectionCollapsed])`. Both stable
  for the picker's purpose. **Win confirmed.**
- `ProcedureSubcategoryPicker` call sites:
  - In ProcedureEntryCard (line 421): `onSelect={handlePicklistSelect}` —
    plain function recreated every render → memo bail. **Flagged for
    Cluster 4** (left as documented future work).
  - In BreastProgressiveAssessment (line 1487): inline arrow → memo bail.
    **Fixed in Cluster 4.**
  - In the aesthetics path: `useCallback` stable. **Win.**

**`a87f7e4` exhaustive-deps.** Verified the 9 array-index dep removals
from HandTraumaAssessment hooks are sound — current state only references
`value.digitAmputations` (parent array ref), no index expressions remain.
The amputationState useMemo body reads only `value.digitAmputations ?? []`,
so the parent ref is sufficient. **Session 5 commit verified clean.**

**`bced1b3` array-type cleanup.** Spot-checked the auto-fix didn't strip
real eslint-disable directives. **Surprise finding** (not a regression):
the auto-fixer removed `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
comments above 8 `theme: any` parameter types in BurnEpisodeTimeline. But
this codebase doesn't enforce `no-explicit-any` (no rule in
`eslint.config.js`), so the disable comments were "orphaned" — never doing
anything. Removing them was correct. **Session 5's claim "explicit-any:
8 → 0" was about the orphaned comments, not the `any` types themselves**
(which still exist and remain unflagged because there's no rule to flag
them). **Session 5 commit verified clean** — no actual regression.

**`5476b98` unused-vars.** Re-grepped every deleted identifier across
client/server/shared (excluding worktrees). All deletions were scoped to
files where the identifier was actually unused. Cross-file usages remain
intact (`isBurnsDiagnosis`, `getDefaultBurnsAssessment`, `getProductById`,
`getSeniorityTier` all still imported elsewhere). The `saveCaseIndex`
deletion was truly orphaned (no remaining callers). **Session 5 commit
verified clean.**

**`0dc0bf5` raw-hex round 2.** Traced PATHOLOGY_OPTIONS migration in
MultiLesionEditor. Confirmed the render-time `theme.pathology[opt.colorKey]`
lookup pattern is sound — chip selected-state branches on
`lesion.pathologyType === opt.value`, applying `pathologyColor + "20"` to
background + full alpha to border + text. No re-render bugs. Similarly
verified burnDepth + nerveSeverity migrations. **Session 5 commit
verified clean.**

### Bottom line

All 7 commits ship the behaviour their messages claim. The "explicit-any:
8 → 0" claim is technically about removed disable-directives, not removed
`any` types — but the 8 `any` types in BurnEpisodeTimeline were never lint
errors (no rule), so this is a wording quirk rather than a functional
issue.

---

## Cluster 2 — Raw-hex round 3 (commits `54313d4` + `69a1c3c`)

The brief target was 132 → under 50. Achieved 132 → 10.

### 3a — Onboarding token activation

`client/theme/tokens.ts` was added with this comment:

> Opus onboarding brand token system. Every onboarding component
> references these names. No hex values in component files — only token names.

But searching the codebase showed **the file was never imported anywhere**.
The 10 onboarding screens all had matching raw hex (#141414, #1C1C1E,
#E5A00D, #B8820A, #AEAEB2, #636366, #38383A, #F59E0B) inline.

The fix is mechanical and 1:1 with the token values:

| Token | Hex | Used for |
|-------|-----|----------|
| `colors.background.primary` | `#141414` | Onboarding canvas |
| `colors.background.elevated` | `#1C1C1E` | Cards, input bg |
| `colors.border.default` | `#38383A` | Card / input borders |
| `colors.border.focused` | `#E5A00D` | Focused border (alias for amber) |
| `colors.text.secondary` | `#AEAEB2` | Supporting text |
| `colors.text.tertiary` | `#636366` | Placeholders, skip links |

Files migrated: HospitalScreen, EmailSignupScreen, SecurityScreen,
TrainingScreen, FeaturePager, AuthScreen, CategoriesScreen, PrivacyScreen,
WelcomeScreen, FeatureSlide.

Total: ~80 raw-hex literals migrated.

### 3b — Cross-codebase sweep

Shadow colours (`shadowColor: "#000"` — always pure black on iOS):
- AttentionCard, FormField (3 hits across 3 sections), ErrorFallback,
  TeamContactsScreen, MediaGalleryViewer chrome
- `→ palette.black`

Brand amber-on-context:
- App.tsx privacy overlay OpusMark color
- AuthScreen OpusLogo color
- CaseDetailScreen histology-pending banner (3 amber tones: bg, icon, text)
- `→ palette.amber[600]`, `palette.amber[800]`, `palette.amber[100]`

Pure white / black constants:
- InboxScreen OVERLAY_TEXT, MediaGalleryViewer BACKDROP + CHROME_TEXT
- OpusCameraScreen viewfinder bg, SetupAppLockScreen Switch thumb
- `→ palette.white`, `palette.black`

Android Switch thumb (one consistent pattern across 6 craniofacial/burns files):
- CraniofacialAssessment (8 hits), CraniosynostosisDetails (5),
  OMENSInput (1), BurnInjuryEventSection (1), TBSARegionalBreakdown (1)
- `Platform.OS === "android" ? "#fff" : undefined` →
  `Platform.OS === "android" ? palette.white : undefined`

App.tsx privacy overlay bg:
- `"#0C0F14"` → `palette.charcoal[950]`

aestheticsConfig INTENT_COLORS (3a hits):
- 4 intent badge colours kept theme-independent (used in chips that must
  be consistent across dark/light): cosmetic / post-bariatric MWL /
  functional-reconstructive / combined
- Migrated to `palette.amber[600]`, `Colors.dark.info`,
  `Colors.dark.success`, `Colors.dark.roleSupervising`

### Remaining 10 raw-hex literals — all skip-rule legitimate

- **8 in `lib/exportPdfHtml.ts`** — CSS inside HTML template string for
  expo-print. Not React Native styles. Migrating would require template
  substitution (ugly) and isn't a win — PDF output doesn't change with
  light/dark theme.
- **2 in `components/media/MediaGalleryViewer.tsx`** — `#555` (placeholder
  Feather icon) and `#999` (placeholder text). Both on the always-black
  immersive viewer chrome. CLAUDE.md skip rule for "always-on-black"
  surfaces.

---

## Cluster 3 — handleMultiDigitConfirm wire-up (commit `e2dd8e8`)

### Investigation

Session 5 deferred this decision. The lint warning was a 50-line
`useCallback` defined but never called.

`git log -S 'handleMultiDigitConfirm' --all --oneline` pointed to commit
`18679aa` (Multi-diagnosis elective hand). Reading that commit:

- It introduced the `hasDigitMultiSelect: true` field on
  `hand_dx_trigger_digit` (unified trigger finger/thumb).
- It introduced the `DigitMultiSelect` component, the
  `MULTI_DIGIT_RESOLUTIONS` data map, and the `resolveDigitConfig`
  helper.
- It added state in DiagnosisGroupEditor:
  `pendingMultiDigitDiagnosis`, `selectedDigits`, and the
  `handleMultiDigitConfirm` callback that builds per-digit procedures
  using `resolveDigitConfig`.
- It exposed 4 optional props on HandElectiveAssessment
  (`pendingMultiDigitDiagnosis`, `selectedDigits`, `onDigitsChange`,
  `onMultiDigitConfirm`) and rendered `<DigitMultiSelect>` conditional
  on all 4 being present.

**BUT** the original commit ALSO didn't pass any of those 4 props to
`<HandElectiveAssessment>` at line 3200 in DiagnosisGroupEditor. So:

1. User taps Stenosing Tenosynovitis → Trigger finger / thumb in
   HandElectivePicker.
2. `handleDiagnosisSelect` fires, detects `dx.hasDigitMultiSelect`, sets
   `pendingMultiDigitDiagnosis` state.
3. HandElectiveAssessment renders WITHOUT the 4 multi-digit props.
4. Inside HandElectiveAssessment: `isPendingMultiDigit = !!pendingMultiDigitDiagnosis`
   evaluates to **false** (prop wasn't passed).
5. DigitMultiSelect never renders.
6. The regular elective procedures flow runs instead — surgeons get the
   generic trigger finger release procedure with no digit picker.

### Wire-up

4-line prop pass-through:

```tsx
<HandElectiveAssessment
  ...
  pendingMultiDigitDiagnosis={pendingMultiDigitDiagnosis}
  selectedDigits={selectedDigits}
  onDigitsChange={setSelectedDigits}
  onMultiDigitConfirm={handleMultiDigitConfirm}
/>
```

### Regression guards

Added 4 tests in `handElective.test.ts` (108 → 112):

- Thumb (I) resolves to trigger thumb SNOMED 202855006 + procedure `hand_comp_trigger_thumb`.
- Fingers (II-V) resolve to trigger finger SNOMED 1539003 + procedure `hand_comp_trigger_finger`.
- Unmapped diagnosis returns null (resolveDigitConfig contract).
- Every key in MULTI_DIGIT_RESOLUTIONS references a real diagnosis with
  `hasDigitMultiSelect: true` (prevents data-file drift).

### Bottom line

Lint warnings: 3 → 2 (the lone client warning closed). Last 2 are
`import/no-named-as-default` from npm packages `expo-server-sdk` and
`express-rate-limit` — we can't fix those without forking the libraries.

---

## Cluster 4 — More perf opportunities (commit `088e5e5`)

### Win 1 — ProcedureClinicalDetails memo + stabilised props

`ProcedureClinicalDetails.tsx` is a 1700-line component that
specialty-dispatches into FreeFlapClinicalFields, SlnbClinicalFields,
HandTrauma clinical fields, etc. It computes derived flags
(`isFreeFlapProcedure`, `isSlnb`, `picklistEntry`) on every render.

It's unmemoized AND called from ProcedureEntryCard with two unstable
props:

```tsx
<ProcedureClinicalDetails
  clinicalDetails={procedure.clinicalDetails || {}}  // new {} per render
  onUpdate={handleClinicalDetailsUpdate}              // recreated per render
  ...
/>
```

Every keystroke in any unrelated case-form field rebuilds the heavy
specialty-dispatched details tree.

**Fix (3 changes):**

1. In ProcedureEntryCard:
   ```tsx
   const clinicalDetailsRef = useMemo(
     () => procedure.clinicalDetails || {},
     [procedure.clinicalDetails],
   );
   ```
2. In ProcedureEntryCard: `handleClinicalDetailsUpdate` upgraded to
   `useCallback([onUpdate, procedure])`.
3. In ProcedureClinicalDetails: renamed `ProcedureClinicalDetails` →
   `ProcedureClinicalDetailsImpl`; exported
   `React.memo(ProcedureClinicalDetailsImpl)` wrapper.

The memo now bails on no-op renders. Caveat: `handleClinicalDetailsUpdate`
still has `procedure` in its deps, so it changes whenever procedure
changes (every keystroke that updates THIS procedure). That's fine —
that's exactly when ProcedureClinicalDetails SHOULD re-render. The win
is that unrelated keystrokes (different procedure, patient info field,
etc.) no longer cascade through.

### Win 2 — BreastProgressiveAssessment picker handler

```tsx
<ProcedureSubcategoryPicker
  ...
  onSelect={(entry) => handleAddPicklistProcedure(entry.id)}  // inline arrow!
/>
```

Session 5 wrapped `ProcedureSubcategoryPicker` in React.memo but this
call site was passing an inline arrow, defeating the memo.

**Fix:** extracted to `handlePicklistEntrySelect = useCallback(...)`
that adapts the entry-object signature to handleAddPicklistProcedure's
id-string signature.

### Deferred to next session

- **ProcedureEntryCard's `removeProcedure` / `moveProcedureUp` /
  `moveProcedureDown` in DiagnosisGroupEditor** are plain functions that
  close over the `procedures` array reference. Inline arrow children at
  the call site (`onDelete={() => removeProcedure(proc.id)}`) defeat
  ProcedureEntryCard.memo for EVERY procedure card on every parent
  render. To stabilise without changing call-site semantics, would need
  `proceduresRef = useRef(procedures); proceduresRef.current = procedures`
  pattern + `removeProcedure = useCallback((id) => { read via
  proceduresRef.current }, [])`. Real win (procedures-array maps to N
  card renders × every keystroke) but bigger surgical change.
- **ProcedureEntryCard's `handlePicklistSelect`** (110-line auto-fill
  builder for free flap / SLNB defaults) — same fundamental issue. Reads
  `procedure`, `diagnosisId`, `clinicalGroup`, `profile`, `onUpdate`.
  Wrapping in useCallback wouldn't help because deps change on every
  procedure mutation.

### Bottom line

The big wins from session 5+6 combined are the dense pickers
(DiagnosisPicker, HandElectivePicker, ProcedureSubcategoryPicker,
HeadNeckDiagnosisPicker) plus now ProcedureClinicalDetails. The
remaining unfixed perf gaps need ref-based refactoring.

---

## Cluster 5 — Test coverage gap audit (commit `60b093e`)

### Methodology

Walked `client/lib/*.ts` (non-test files), cross-referenced against
`client/lib/__tests__/*.test.ts`, ranked the gaps by:
- Pure logic vs React-coupled (skip React-coupled)
- Clinical data path (save pipeline, display invariants)
- Surface area (lines of code, callsite count)

### Gaps identified (12 files with 0 direct tests)

| File | Lines | Priority | Reason |
|------|-------|----------|--------|
| moduleVisibility | 217 | **CLOSED this session** | Gates all specialty modules |
| caseNormalization | 135 | **CLOSED** | Runs on every save |
| caseDiagnosisSummary | 25 | **CLOSED** | 25+ display surfaces |
| seniorityTier | 113 | **CLOSED** | EPA derivation + assessor roles |
| moduleSummary | 328 | Deferred | Summary text per module (mostly display) |
| melanomaStaging | 419 | Deferred | AJCC 8th Ed staging logic |
| procedureConfig | 393 | Deferred | Procedure metadata |
| handElectiveFlow | 65 | Deferred | SNOMED fallback state builder |
| buildShareableBlob | 39 | Deferred | E2EE blob construction (has indirect coverage via sharingBridge.test.ts) |
| episodeHelpers | 86 | Deferred | Episode link/update plans |
| auth | various | Deferred (I/O) | API surface, would need fetch mocks |
| sharingApi/teamContactsApi/assessmentApi/discoveryService | various | Deferred (I/O) | All API surface |

### Tests added (+69)

**moduleVisibility.test.ts** — 32 tests across 4 describe blocks:
- procedureHasFreeFlap (PICKLIST_TO_FLAP_TYPE map + tag detection + false cases)
- procedureHasPedicledFlap
- Case-level flap predicates (caseHasFreeFlap, caseHasFlapProcedure)
- caseNeedsJointContext (H&N gate)
- getModuleVisibility — 11 specialty activations:
  - handTraumaAssessment (only "trauma" case type triggers; acute/elective don't)
  - breast / cleft_cranio / aesthetics / peripheral_nerve / lymphoedema /
    skin_cancer / burns specialty gates
  - burns acute-only specificity (`burns_dx_acute` vs `burns_dx_recon_scar`)
  - Existing-data fallback (peripheralNerveAssessment persists if data
    exists, even on wrong specialty — re-edit safety)
  - Flap procedure activates flapDetails + flapOutcome
  - complex_wound tag activates woundAssessment
  - Episode type (`wound_management`) activates woundAssessment
  - infectionOverlay activates infection (first group only)
  - Escalated hand infection activates full module
  - All-false baseline for general-specialty case

**caseNormalization.test.ts** — 8 tests:
- Identity short-circuit when no changes needed (perf — avoid cloning)
- ISO timestamp → YYYY-MM-DD repair
- Undefined optional dates preserved
- Skin cancer prior + current histology reportDate (group level)
- Lesion-level histology dates (multi-lesion sessions)
- Identity short-circuit for already-canonical histology
- Breast assessment passthrough (untouched when no data)
- Breast assessment invokes normalizeBreastAssessment when data present

**caseDiagnosisSummary.test.ts** — 8 tests:
- getDiagnosisGroupTitle: undefined input, displayName fallback,
  hand trauma title precedence
- getDiagnosisGroupSubtitle: null cases
- getCasePrimaryTitle: empty groups, first-group selection

**seniorityTier.test.ts** — 21 tests:
- getSeniorityTier: null/undefined/empty/unknown → null
- All 6 country tier mappings (NZ consultant=5, UK consultant=5,
  DE Chefarzt=6, US attending=5, US fellow=3)
- Legacy backward-compat values (consultant_specialist=5, fellow=4,
  set_trainee=3, registrar_non_training=2, junior_house_officer=1)
- isSeniorTo ladder: senior > junior, equal tiers, junior > senior,
  unknown stages, null inputs
- isSeniorTo across countries (NZ PGY1 vs UK consultant)
- CAREER_STAGE_TIERS coverage: all 6 countries present, tiers 1-6
  each have at least one stage

### Bottom line

Test files: 87 → 91 (+4). Tests: 1545 → 1614 (+69). All cluster-5 new tests
target pure-logic paths with no React-component mocking — small + fast +
fragile-only-to-real-regressions.

---

## Cluster 6 — CLAUDE.md drift audit (commit `21c6fe4`)

### Methodology

Compared every quantitative claim in CLAUDE.md against the live codebase.
Used grep + find + wc to compute current state.

### Drifts found and fixed

| Location | Old claim | Current state | Notes |
|----------|-----------|---------------|-------|
| Line 125 (project structure) | "27 screens + 9 onboarding" | "33 main + 10 onboarding" | Onboarding 10 includes 2 wrapper files |
| Line 271 | "286 structured diagnoses" | "477 structured diagnoses" | Way out of date |
| Line 250 | "Staging (14 configs)" | "21 SNOMED-keyed configs surfacing 29 individual staging systems" | Configs vs systems distinction |
| Line 625 | "17 systems" | "29 staging systems" with enumeration | |
| Line 1477 | "1540 tests across 87 files" | "1614 tests across 91 files" | Includes this session's additions |
| Line 1613 | "Total: 36 screen files (27 + 9)" | "Total: 43 (33 + 10)" with footnote | Plus enumeration of 6 missing screens |
| Line 1625 (table) | Hand Surgery 103 | 106 | Multi-digit + forearm additions |
| Line 1641 (table) | Orthoplastic 14 | 16 | |
| Line 1645 | "481 structured diagnoses" | "477" | Was overcounted |
| Line 1790 | "193 unique static + 94 unique dynamic = 287 total" | "269 unique static + 127 unique dynamic = 396 unique" | testID growth |

### Verified unchanged

- Line 1715: "ModuleVisibility object with 13 boolean flags" — current
  count is 13. Match.
- Phase status entries (Phase 5/6/7/7.1) — historical, not state claims.
- Diagnosis Inventory table for non-hand-surgery, non-orthoplastic specialties — all match.

### Drifts NOT touched

- The screen map TABLE itself (line 1543+) still doesn't list the 6
  missing screens individually. Adding them as rows would be a bigger
  edit — left footnote instead. Future session can flesh out the table.

---

## Findings — triaged

### 🟢 Cleared this session

- **Half-shipped multi-digit trigger digit feature** — wired up. Trigger
  finger / thumb now properly surfaces the digit picker.
- **Dormant onboarding token system** — activated across 10 screens.
- **132 raw-hex literals → 10** — far below session brief's <50 target.
- **3 → 2 lint warnings** — only 2 upstream-only warnings remain.
- **ProcedureClinicalDetails unmemoized + unstable props** — fixed.
- **BreastProgressiveAssessment picker handler inline arrow** — fixed.
- **0 test coverage on moduleVisibility / caseNormalization /
  caseDiagnosisSummary / seniorityTier** — 69 new tests.
- **CLAUDE.md drift on 10+ quantitative claims** — fixed inline.

### 🟡 Skipped or deferred

- **ProcedureEntryCard's `removeProcedure` / `moveProcedureUp` /
  `moveProcedureDown` callbacks** — close over `procedures` array,
  defeat the React.memo on every procedure card on every parent render.
  Would need `proceduresRef` ref-based refactor. Real win but bigger
  surgical change than this session's scope. **Recommended for session 7.**
- **ProcedureEntryCard's 110-line `handlePicklistSelect`** — same
  fundamental issue. Wrapped in useCallback would still change every
  procedure mutation. Future ref-based refactor candidate.
- **Test coverage gaps remaining**: moduleSummary (328 lines),
  melanomaStaging (419 lines), procedureConfig (393 lines),
  handElectiveFlow (65 lines), buildShareableBlob (39 lines),
  episodeHelpers (86 lines), plus the I/O surface
  (auth/sharingApi/teamContactsApi/assessmentApi/discoveryService).
- **The 6 screens missing from CLAUDE.md's App Screen Map table**
  (AssessmentScreen, AssessmentHistoryScreen, AssessmentRevealScreen,
  SharedCaseDetailScreen, SharedInboxScreen, OnboardingScreen) — added
  a footnote but didn't flesh out individual table rows. Future doc
  cleanup.

### 🔴 Carried forward (deferred since session 2/3/4)

- **Onboarding has no PIN-skip** (sessions 3 + 4 + 5). Still a product
  decision needed. App-Lock setup is mandatory at first run.
- **Inconsistent / Unpolished design-pass items** (nav-pill ellipsis,
  chip-text truncation in dense grids, AddCase specialty-card vertical
  distribution, episode cards showing raw patient identifier where case
  cards show names, EpisodeDetail "Change Status" amber fill reading as
  a selection). All visual-pass items that need Mateusz's eye, not
  audit-time fixes.

### Brought up but not actioned this session

- **`theme: any` in BurnEpisodeTimeline** (and similar) — could be
  tightened to `typeof Colors.light`. Not a lint error (no rule), but
  type safety would benefit. Low priority — not a regression.
- **MediaGalleryViewer's `#555` and `#999` chrome** — could migrate to
  `palette.charcoal[700]` and `palette.charcoal[400]`. Skip-rule
  legitimate but would be a cleaner consistency win. Marginal.

---

## Coverage & gaps

### Covered

- ✅ **Cluster 1 — Session 5 self-review.** All 7 commits verified.
- ✅ **Cluster 2 — Raw-hex round 3.** 132 → 10 (target was <50).
- ✅ **Cluster 3 — handleMultiDigitConfirm.** Wired up + 4 regression tests.
- ✅ **Cluster 4 — Perf opportunities.** 2 new wins; 2 deferred (documented).
- ✅ **Cluster 5 — Test coverage gaps.** 4 of 12 most critical gaps closed.
- ✅ **Cluster 6 — CLAUDE.md drift.** 10+ quantitative claims fixed.

### Gaps — recommended for session 7

- **Cluster 7 — On-device verification** (skipped — sim not booted).
  BCRL staging fix from session 5 still needs surgeon-side spot-check.
  PerProcedure teamFooter, joint implant arthroplasty, burns acute TBSA
  body outline, free flap anastomosis entry still need visual captures.
- **Cluster 8 — Maestro flow extensions** (skipped — same reason). 3
  flows proposed: case-form-skin-cancer.yaml, onboarding-replay.yaml,
  attention-card-actions.yaml.
- **Cluster 9 — Deep specialty captures** (skipped).
- **ProcedureEntryCard ref-based perf refactor** — biggest remaining
  perf win in the procedure-entry hot path. Real perf impact but
  requires the `proceduresRef` pattern across removeProcedure /
  moveProcedureUp / moveProcedureDown + same for handlePicklistSelect.
- **More test coverage**: moduleSummary, melanomaStaging,
  procedureConfig, handElectiveFlow, buildShareableBlob,
  episodeHelpers, plus the I/O surface.
- **CLAUDE.md App Screen Map table** — add individual rows for the 6
  missing screens.

### Off-limits next session

- The "design pass" items (visual polish) — explicitly out of scope per
  the original brief and still require Mateusz's product eye.
- `server/` — back to off-limits unless another clinical bug surfaces.

---

## Numbers

| Metric | Start of session | End of session | Δ |
|--------|-----------------|----------------|---|
| Tests | 1541 | 1614 | +73 |
| Test files | 87 | 91 | +4 |
| Lint warnings | 3 | 2 | -1 |
| Raw-hex literals in client/ | 132 | 10 | -122 |
| `tsc --noEmit` errors | 0 | 0 | 0 |
| Commits | 0 | 6 | +6 |
