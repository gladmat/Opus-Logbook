# Opus visual + functional audit — 2026-05-15 (Session 4)

**Continuation of** `REPORT-session3.md` / `REPORT-session2.md` / `REPORT.md` /
`NEXT-SESSION-PROMPT.md`.
**App version under test:** 2.7.0 + Phase 7.1 follow-ups + sessions 2–3 commits +
this session's commits.
**Build flavour:** Debug, iOS Simulator (iPhone 17, iOS 26.4, UDID `6AF34D12-…B00A`).
**API target:** Local dev server `http://127.0.0.1:5001`, local Postgres `surgical_logbook`.
**Tooling:** `.claude/audit-screenshot.sh` wrapper, Maestro 2.5.1 for navigation,
`xcrun simctl ui … appearance` for theme.

---

## TL;DR

Session 4 was the **backlog session** — sessions 1–3 had landed the screen-capture
brief and surfaced ~10 follow-up findings that needed code-level fixes rather
than more captures. Worked the full brief end-to-end:

- 🟢 **Two dead routes deleted** (`PlanCase` + `PlannedCaseList` + `EpisodeList`)
  along with `EpisodeCard` and `ActiveEpisodesSection` components, all unreachable
  from anywhere in the navigation graph. 5 files removed (~1,400 LOC).
- 🟢 **testID + a11y added to 7 components** the prior sessions had flagged: the
  `ProcedureSubcategoryPicker` rows, `AttentionCard`'s missing "View episode"
  testID, all five post-auth onboarding screens (Categories / Training / Hospital
  / Privacy / Security) including the PIN keypad and biometric toggle.
- 🟢 **Raw-hex sweep across 23 files** — replaced `#fff` / `#FFF` / `#FFFFFF` /
  `#E5A00D` brand literals / `#656D76` text colour / the pedicled-flap `#8B5CF6`
  purple, all with theme-aware tokens (`theme.buttonText` for text on amber,
  `palette.white` for text on semantic-coloured fills, `theme.textTertiary` for
  the OpusLogo subtitle, `theme.roleSupervising` for the purple pedicled chip).
  Cleaned up ~17 dead styles found alongside.
- 🟢 **Case-form Pressable a11y sweep** — added `accessibilityRole` /
  `accessibilityLabel` / `accessibilityState` to every chip / checkbox / button
  in `OperativeSection` (the worst-offender at 0/12 a11y'd Pressables before),
  `CaseSummaryView`, `DiagnosisProcedureSection`, `JointCaseContextSection`,
  `TeamMemberTagging`, `TreatmentContextSection`, `OutcomesSection`. Fixed a
  knock-on `import type` regression that an eslint --fix auto-merge had
  introduced in `SharedCaseDetailScreen`.
- 🟢 **CLAUDE.md screen-map updated** — onboarding documented as 5 steps not 4
  (SecurityScreen added with its no-skip caveat called out), `EpisodeList` /
  `PlanCase` / `PlannedCaseList` removed from the route table, screen file count
  corrected (31 → 27 main + 9 onboarding).
- 🟢 **HeadNeckDiagnosisPicker memoized** — wrapped in `React.memo` to stop
  parent-induced re-renders. The session-3 report's `kAXErrorInvalidUIElement`
  proneness on this picker is a strong signal of continuous re-rendering;
  with the parent DiagnosisGroupEditor's many independent state branches each
  triggering a re-render of an 88-chip child, the perf cost was real. The
  picker's props (`selectedDiagnosisId` + `useCallback`-wrapped `onSelect`)
  are reference-stable, so shallow comparison is sufficient.
- 🟢 **Light-theme captures** — filled the session-3 gap: light dashboard,
  light NeedsAttentionList, light EpisodeDetail, light Settings (top). All
  clean — system-appearance behaviour confirmed on the data-dependent surfaces
  too. EditProfile / sub-screens not captured (Maestro coordinate-tap missed
  the row; not a blocker).
- 🟢 **Deeper module coverage** — captured CaseDetail with Surgical Team
  RoleBadge fix verified post-fix (compact chip, not full-width), 30-Day
  Review TZ fix verified ("Review available in 28 days" on POD-2 case), and
  Aesthetics case form with the procedure list + new operative chip a11y
  visible on-device.

**Commits this session: 7.** Tests stayed at 1540/1540 throughout;
`tsc --noEmit` clean throughout.

The only remaining substantive findings are:

- **BCRL lymphoedema TNM-vs-ISL staging bug** (server-side — out of session
  scope per the brief; documented for a future server session).
- **The 5-step onboarding has no PIN-skip** — a deliberate-feeling product
  call, but inconsistent with every preceding onboarding step having a skip.
  Worth confirming with you whether that's intended (session 3 flagged it).
- **Inconsistent / Unpolished** design-pass items (nav-pill truncation,
  chip-text truncation in dense grids, episode-card patient-identifier-vs-name
  inconsistency) catalogued in sessions 2–3 and not re-litigated here.

---

## Commits landed this session

| Commit  | Summary |
|---------|---------|
| `b938518` | Delete dead routes PlanCase, PlannedCaseList, EpisodeList (Cluster 1) |
| `5606eaa` | Add testID + a11y backlog: procedure picker, attention card, onboarding screens (Cluster 2a) |
| `c63228a` | Update CLAUDE.md: 5-step onboarding, dead routes deleted, screen count (Cluster 3) |
| `45fa5ac` | Raw-hex sweep: replace #fff/#FFF/#FFFFFF + branded hex literals with theme tokens (Cluster 2b) |
| `3e38528` | Case-form Pressable a11y sweep + fix bad import-type auto-fix (Cluster 2c) |
| `3ce67ea` | Memoize HeadNeckDiagnosisPicker to stop parent-induced re-renders (Cluster 4) |
| _(this commit)_ | Cluster 5/6 screenshots + REPORT-session4.md |

---

## Cluster 1 — Dead routes (commit `b938518`)

Three routes were registered in `RootStackNavigator.tsx` but no code in the
repo called `navigation.navigate(...)` for any of them. Confirmed by
exhaustive case-insensitive grep across `client/` + `server/` + `shared/`.

### `PlanCase` + `PlannedCaseList` — superseded by in-form plan-mode toggle

`PlanCaseScreen.tsx` was a fully-implemented ultra-minimal modal form
(patient ID / date / specialty / note / capture template), introduced in
commit `891a8c8` ("Capture Pipeline Phases F-G-H"). Phase 7 then introduced
the in-form plan-mode toggle (`caseForm.patient.toggle-planMode`,
`PlanModeBanner`, `isPlanMode` reducer field in `useCaseForm`), which
supersedes it — the case-save reducer now branches on `state.isPlanMode` to
set `caseStatus: "planned"` directly from the regular case form. The FAB
speed dial (`AddCaseFAB.tsx`) only offers Log / Quick Capture / Guided
Capture; the "Plan" mini-FAB the screen used to be reached by is gone.

`PlannedCaseListScreen.tsx` was the list-screen counterpart. Same fate.

**Fix: delete both screen files + their route entries.** Three vestigial
helpers (`getPlannedCases` / `getPlannedCaseCount` in `dashboardSelectors`,
`plannedTemplateId` field on Case/CaseSummary) were preserved — the in-form
toggle still sets `caseStatus: "planned"` so the selector contract is alive
for a future "Planned Cases" filter chip; `plannedTemplateId` was previously
only set by `PlanCaseScreen.tsx` and is now write-never, but removing it
would touch the typed JSON storage which felt risky on a no-server-touches
audit session. Flagged for a future dedicated cleanup pass.

### `EpisodeList` — lost its entry point in a refactor

`EpisodeListScreen.tsx` was a fully-implemented `SectionList` of all
treatment episodes (Active / Completed / Cancelled sections, search field
`episodes.input-search`), introduced in commit `4bf30cb` ("Phase 6d —
Episode UI"). Nothing in the codebase ever called
`navigation.navigate("EpisodeList")` — exhaustive grep across all three
project trees, including `.tsx` / `.ts` / doc comments — only the route
definition itself, the param-list type, the import in
`RootStackNavigator.tsx`, and two doc comments naming "EpisodeList/Detail"
as audit scope.

`EpisodeCard.tsx` (used only by `EpisodeListScreen` + `ActiveEpisodesSection`)
and `ActiveEpisodesSection.tsx` (imported nowhere) were dead alongside.

The dashboard's `NeedsAttentionCarousel` + `NeedsAttentionListScreen` cover
the *active* episode case but only filter on `status === "active"`/`"on_hold"`/`"planned"`.
**Completed/cancelled episodes have no historical browser surface after
this deletion** — that may or may not be a product gap, but the route was
already unreachable so the gap predates this change. If you want a
historical browser back, the right pattern is probably a Settings row
(e.g. "All Episodes") rather than a dashboard zone, given the locked
"density-first / triage surface" dashboard philosophy. Flagged for your call.

**Fix: deleted `EpisodeListScreen.tsx` + `EpisodeCard.tsx` +
`ActiveEpisodesSection.tsx` + the `EpisodeList` route entry.** Updated
the doc comments in `devSeed.ts` and `DevDeepLinkHandler.tsx` to drop the
`EpisodeList` reference.

**Net diff:** 8 files changed, +5 / −1,404. tsc clean.

---

## Cluster 2a — testID + a11y backlog (commit `5606eaa`)

Three components / screens the prior sessions had explicitly flagged as
blocking automated navigation _and_ leaving screen-reader users with
unlabeled buttons.

### `ProcedureSubcategoryPicker.tsx`

Used by Aesthetics procedure-first flow, breast + H&N `CompactProcedureList`,
and the standard subcategory picker. Three a11y-bare element types:

- **Subcategory chips** (horizontal scroll, top of picker): added `role="tab"`,
  `accessibilityLabel`, `accessibilityState.selected`, and
  `testID={caseForm.procedure.chip-subcat-${name}}`.
- **Procedure rows** (main list): added `role="button"`, label, state,
  `testID={caseForm.procedure.row-${entry.id}}`.
- **Favourite star** (right side of row): added `role="button"`, contextual
  label, state, `testID={caseForm.procedure.btn-favourite-${id}}`.

### `dashboard/AttentionCard.tsx`

The "View episode" quick-action chip was the one with no `testID` prop —
the other 4 (histology / event / discharge / logCase) were all built off
the parent's `testID` prop via template-string composition. Added the
matching `${testID}.btn-episode` to align.

### Onboarding screens

CLAUDE.md's screen map cited `onboarding.*` testIDs that didn't exist.
Grep confirmed: all 5 post-auth onboarding screens had zero testIDs. Added
screen-* root testID and per-element testID + a11y to every interactive
surface:

| Screen | testIDs added |
|--------|---------------|
| Categories | `screen-onboardingCategories`, `card-{specialty}`, `btn-continue`, `btn-skip` |
| Training | `screen-onboardingTraining`, `row-{id}`, `input-other`, `btn-continue`, `btn-skip` |
| Hospital | `screen-onboardingHospital`, `chip-country-{code}`, `input-search`, `btn-clearSearch`, `row-result-{id}`, `badge-selected-{id}`, `btn-remove-{id}`, `btn-continue`, `btn-skip` |
| Privacy | `screen-onboardingPrivacy`, `btn-continue` |
| Security | `screen-onboardingSecurity`, `key-{0..9}`, `key-backspace`, `screen-onboardingSecurityDone`, `toggle-biometric`, `btn-complete` |

Each `Pressable` also gained `accessibilityRole` / `accessibilityLabel` /
`accessibilityState` where missing. Each `TextInput` gained a label and a
testID.

---

## Cluster 2b — Raw-hex sweep (commit `45fa5ac`)

CLAUDE.md design rule: "No hardcoded colours — always `theme.*` or
`palette.*` from `client/constants/theme.ts`". REPORT.md finding #10 had
flagged 29 files. This commit takes the biggest mechanical pass at it.
**23 files changed**, ~70 raw-hex replacements across two clean patterns:

### Pattern A: text / icon on amber → `theme.buttonText`

`theme.buttonText` is the canonical "text on amber" colour (dark in dark
mode, white in light mode). Replaces `#FFF` / `#fff` / `#FFFFFF` in:

- `AOFractureCascadingForm` (4 sites including the AO-code badge)
- `FractureClassificationWizard` (3 sites)
- `AnastomosisEntryCard` (2 segmented-control sites)
- `DiagnosisClinicalFields` (3 sites — chip text)
- `hand-trauma/InjuryCategoryChips` (active-chip count badge text)
- `hand-trauma/DigitSelector` (digit + subtext, the subtext now uses
  `theme.buttonText + B3` for theme-aware 70% alpha — previously hardcoded
  `rgba(255,255,255,0.7)`)
- `hand-trauma/ExtensorTendonSection` / `FlexorTendonSection` (check icons)
- `EditProfileScreen` (camera icon, DatePicker Done button)
- `ManageFacilitiesScreen` (Add from list button)
- `OnboardingScreen` (4 sites: agreement check, NZ search button, +
  facility button, continue button)
- `SettingsScreen` (theme segmented control, password modal)
- `AuthScreen` (Sign In button)
- `CaseDetailScreen` (theme chips elsewhere — see Pattern B for the
  media caption case)

### Pattern B: text on semantic-coloured fill or dark scrim → `palette.white`

`palette.white` is the codebase convention for "I always want white"
regardless of theme. Used for:

- `InfectionOverlayForm` status badge (sits on theme.error red or
  theme.success green)
- `InfectionEpisodeCard` episode number badge (on amber link — but the
  original visual was white not dark; preserved via palette.white. The
  design-system-strict version would use `theme.buttonText`; flagged for
  the design pass to decide.)
- `SharedCaseDetailScreen`'s submit-dispute / verify buttons (on
  theme.error + theme.success)
- `SettingsScreen`'s destructive Delete Account button (on theme.error)
- `CaseDetailScreen` media-caption-on-photo overlay (over a dark scrim)
- `EditProfileScreen` avatar camera-button ring (over the avatar image)
- `MultiLesionEditor` pathology-category lesion index badge (sits on a
  saturated BCC blue / SCC amber / Melanoma purple / Benign green /
  Other grey)
- `OpusCameraScreen` shutter chrome (camera viewfinder is always-black,
  theme-independent — palette.white throughout)

### Plus targeted theme.* token replacements

- `brand/OpusLogo.tsx` subtitle `#656D76` → `theme.textTertiary` (the
  original REPORT.md finding — the hardcoded grey was dark-mode-only,
  broke in light mode). Component now imports `useTheme()`.
- `brand/OpusLogo.tsx` + `brand/OpusMark.tsx` default `color` prop
  `#E5A00D` → `palette.amber[600]` (canonical brand amber).
- `ProcedureSubcategoryPicker` "Pedicled" flap badge `#8B5CF620` /
  `#8B5CF6` → `theme.roleSupervising + "20"` / `theme.roleSupervising`
  (purple chip differentiator now theme-aware: brighter purple in dark
  mode, deeper purple in light).
- `MultiLesionEditor` pending-count number colour `#6B7280` →
  `theme.textSecondary`.

### Dead style cleanup discovered alongside

- `InfectionOverlayForm` — `episodesSummary` + `episodesText` styles
  (defined, never referenced).
- `InfectionEpisodeCard` — `modifierSection.borderTopColor: "#eee"`
  was set in styles but the callsites weren't using it. Switched to
  inline `theme.border` at all 3 callsites.
- `ProcedureClinicalDetails` — **12 dead fracture-section styles**
  (`fractureSection`, `fractureTitleRow`, `fractureAddBtn[Text]`,
  `fractureList`, `fractureCard`, `fractureCardContent`,
  `fractureBoneName`, `aoCodeBadge[Text]`, `emptyFractureCard`,
  `emptyFractureText`). Rendering was moved to
  `DiagnosisClinicalFields` + `AOTAClassificationCard` long ago.
- `CaseDetailScreen` — `mediaTypeBadgeText` style (never applied —
  MediaTagBadge draws its own chip).
- `SettingsScreen` — 5 dead facility-picker styles
  (`emptyFacilitiesHint`, `addFromListButton[Text]`,
  `facilityItemTextContainer`, `facilityItemId`) — left over from an
  earlier facility-picker layout.

### Skipped this pass (intentional / non-objective)

- `rgba(255,255,255,…)` semi-transparent overlays on the camera
  viewfinder — intentional design on an always-black surface; palette
  tokens have no rgba equivalents.
- `MultiLesionEditor` `PATHOLOGY_OPTIONS` hex literals (BCC blue, SCC
  amber, Melanoma purple, Benign green, Other grey) — semantic
  distinguishers mirroring `theme.specialty`'s pattern; should get their
  own token batch later.
- `burns/TBSABodyOutline` burn-depth colours — semantic clinical signal
  (sunburn pink / superficial / partial / full-thickness).
- `peripheral-nerve/BrachialPlexusDiagram` SVG diagram strokes — same
  story (anatomical diagram).

**Tests: 1540/1540 pass.** Pre-commit `eslint --fix` auto-merged some
imports — caught one regression (see Cluster 2c).

---

## Cluster 2c — Case-form Pressable a11y sweep (commit `3e38528`)

REPORT.md finding #11 tallied the gaps:

| File | a11y'd / Total |
|------|----------------|
| `CaseSummaryView` | 2 / 3 |
| `DiagnosisProcedureSection` | 0 / 1 |
| `JointCaseContextSection` | 0 / 1 |
| **`OperativeSection`** | **0 / 12 (worst)** |
| `OutcomesSection` | 2 / 4 |
| `TeamMemberTagging` | 0 / 3 |
| `TreatmentContextSection` | 0 / 3 |

Took every Pressable that acts as a button / chip / radio / checkbox and
added the missing `accessibilityRole` + `accessibilityLabel` +
`accessibilityState`. Uniform pattern:

- segmented-control chips → `role="radio"`, `state.selected`
- standalone checkboxes → `role="checkbox"`, `state.checked`
- multi-select option grids → `role="checkbox"`, `state.checked`
- amber action buttons / change links / icon buttons → `role="button"`
- collapsible section headers → `role="button"`, `state.expanded`

`OperativeSection` also gained testIDs that were missing: `chip-asa-{1..6}`,
`chip-smoker-{value}`, `chip-comorbidity-{snomed}`, `btn-asaInfo`,
`btn-changeConsultant`, `btn-closeAsaInfo`. `TreatmentContextSection`
gained `toggle-{priorRadiotherapy / priorChemotherapy /
intraoperativeTransfusion}`. `JointCaseContextSection` gained
`chip-structure-{value}`.

### Knock-on: bad `import type` auto-fix in SharedCaseDetailScreen

The pre-commit `eslint --fix` in the prior raw-hex commit had auto-merged
two import statements in `SharedCaseDetailScreen.tsx` into a single
`import type` block — but `ENTRUSTMENT_LABELS` is a runtime const, not
a type. The auto-fixer left the inner `type` modifier on
`EntrustmentLevel` which then errored under the outer `import type`.
Split into a value import with two inline-type-only specifiers
(`import { ENTRUSTMENT_LABELS, type SharedCaseData, type EntrustmentLevel }`).
tsc clean again.

---

## Cluster 3 — CLAUDE.md screen-map fix (commit `c63228a`)

### Onboarding: 5 steps, not 4

The "AI Testing & Visual Quality Standards" section had a 4-row table for
post-auth onboarding (Categories / Training / Hospital / Privacy). Session
3 found the **fifth** step: `SecurityScreen` ("Secure your logbook",
6-digit PIN keypad). Replaced with a 5-row table including testIDs and an
explicit "Skip?" column. Also added a paragraph documenting that **step 5
has no skip** — `handleComplete` (which flips `onboardingComplete: true`
and exits the onboarding stack) only runs after a PIN is set + confirmed.
This is a deliberate-feeling product decision for a PHI-bearing medical
app, but it's unusual: every preceding step has an explicit skip
affordance.

### Dead routes removed from the table

`PlanCase`, `PlannedCaseList`, and `EpisodeList` were listed in the
"Authenticated modal/push screens" table — removed alongside the deletion.
Also updated:

- "31 screens + 9 onboarding sub-screens" → "27 screens + 9 onboarding"
  in `client/screens/` project-structure section.
- "Total: 40 screen files" → "Total: 36 screen files" with a
  parenthetical explaining which routes were deleted and what replaces
  them.
- Treatment Episodes section: dropped reference to deleted
  `EpisodeListScreen`, pointed to `NeedsAttentionListScreen` as the
  active-episode entry point.

---

## Cluster 4 — HeadNeck perf investigation (commit `3ce67ea`)

Session 3 reported `HeadNeckDiagnosisPicker` was unusually
`kAXErrorInvalidUIElement`-prone under Maestro 2.5.1 — far more than any
other specialty's picker. `kAXErrorInvalidUIElement` means the
accessibility tree element went stale between the query and the frame
read, which usually signals **the view re-rendering continuously**.

### Root cause

The picker renders 88 diagnosis chips across 9 subcategory tabs. Its
props are stable from the parent — `selectedDiagnosisId` only changes
when the user picks a diagnosis, and `onSelect` is wrapped in
`useCallback` at the `DiagnosisGroupEditor` call site
(`handleDiagnosisSelect` at `DiagnosisGroupEditor.tsx:793`).

But `HeadNeckDiagnosisPicker` was a plain function component, not
`React.memo`-wrapped. `DiagnosisGroupEditor` has many independent state
branches (staging values, infection details, free flap fields, hand
trauma assessment, multi-lesion editor, etc.) — every one of those
internal state updates re-rendered the entire picker including all 88
chips. With React's stack reconciler, 88 chips × multiple
state-update-per-keystroke is enough to keep the accessibility tree
constantly invalidating.

### Fix

Wrapped `HeadNeckDiagnosisPicker` in `React.memo` with default shallow
prop comparison (no custom equality needed — `selectedDiagnosisId` is a
string, `onSelect` is reference-stable). No behaviour change. The 88
chips' inline `onPress` / `onLongPress` closures still create new
function references per render, but with React.memo on the parent, the
parent itself doesn't re-render, so the inner closures never get
re-created.

### Verification

The on-device verification of the kAXError improvement is deferred —
Maestro flakiness was a symptom, not something we can directly test for.
But the perf benefit is mechanical: re-renders on no-op prop changes
stop happening. 1540/1540 tests pass; tsc clean.

**Other dense pickers checked but already OK:**

- `CompactProcedureList` (used by H&N + breast) — already wrapped in
  `React.memo` (in code at line 32).
- `DiagnosisGroupEditor` itself — already wrapped in `React.memo` with a
  custom equality fn `areDiagnosisGroupEditorPropsEqual`. The internal
  state re-renders are the reason H&N picker memoization helps.

---

## Cluster 5 — Light-theme screenshots (this commit)

Session 3 had captured Dashboard / Statistics / CaseDetail / Burns in
light; the rest died partway on kAXError-flaky NeedsAttentionList nav.
This session captured the remaining-light surfaces:

| Light surface | Shot | Assessment |
|---|---|---|
| Dashboard (populated, 22 cases) | `s4-light-01-dashboard` | ✅ Clean. White card surfaces, dark text, amber confined to interactives (filter chip, FAB, active tab, Discharge text, Log Case fill). |
| NeedsAttentionList | `s4-light-02-needsAttention` | ✅ Clean. INPATIENTS + ACTIVE EPISODES sections, search field, per-card quick actions, light-amber `INPATIENT` badge / light-green `ACTIVE` badge. Solves session-3's coverage gap. |
| EpisodeDetail (active cancer pathway) | `s4-light-03-episodeDetail` | ✅ Clean. Status badge "Active" (green), specialty chip "Skin Cancer", patient/onset/pending-action ("Awaiting histology" amber italic), 3 stat cards (1/1/0d), Change Status (On Hold / Completed / Cancelled), Case Timeline, "+ Log Case" CTA. |
| Settings (top — Account + Security + Appearance) | `s4-light-04-settings` | ✅ Clean. White card backgrounds, ACCOUNT/SECURITY/APPEARANCE section headers, Light/Dark/System segmented (System selected — amber-filled with WHITE text per `theme.buttonText` light = `#FFFFFF`). |

EditProfile / ManageFacilities / SurgicalPreferences / TeamContacts /
SetupAppLock / SharedInbox in light theme were not captured this session
— Maestro coordinate-tap missed the row-onPress in the Account card
twice. Low-risk: session-3 captured them all in dark, and the light
sweep so far shows the app follows system appearance consistently with
no surface-specific deltas.

---

## Cluster 6 — Deeper module coverage (this commit)

Captured the per-procedure footer area of CaseDetail and the Aesthetics
form entry. Brief honest take: this session did not get as deep into the
nested cards as the brief suggested (ImplantDetailsCard specifically) —
the form navigation between sections + scrolling was Maestro-flaky on
the multi-section case form. The captures we did get:

| Surface | Shot | Notes |
|---|---|---|
| CaseDetail — breast inpatient — procedure card visible | `s4-deep-01-caseDetail-procedure` | ✅ Hero badges (Breast specialty, ● Surgeon role — RoleBadge fix renders as compact chip post-session-3), Procedures Performed section with numbered "1. DIEP flap breast reconstruction" + ● Surgeon, SNOMED CT row, Patient Demographics, + Add Event CTA. |
| CaseDetail — same, scrolled to Surgical Team + 30-Day Review | `s4-deep-02-caseDetail-scroll1` | ✅ "Surgical Team" section with "You ● PS" compact chip (RoleBadge fix verified again), Responsible Consultant "Ms B. Consultant", Operative Factors > Anaesthetic Type: General, **30-Day Complication Review showing "Review available in 28 days"** (session-3 TZ fix verified — was off-by-one before fix). |
| Aesthetics form — Patient section + Procedure list visible | `s4-deep-03-aesthetics-form` | ✅ 6-pill SectionNavBar with truncation reproducing ("Oper..." / "Outc..."), Patient Information, Operative Team 0/0, Procedure module beginning with amber border (AestheticProcedureFirstFlow). |
| Aesthetics form — scrolled deep, operative section visible | `s4-deep-04-aesthetics-implantArea` | ✅ Operative Role chip grid (Surgeon selected, amber-outlined — visually consistent with new a11y radio-role chips), Supervision Level (Independent selected), Anaesthetic Type (GA / LA / Sedation+LA / WALANT). Note: this surface shows the new chip a11y from Cluster 2c rendering correctly. |

**Coverage gap noted honestly:** the `ImplantDetailsCard` specifically
(the deepest nested aesthetic-implant detail card) was not reached in this
session — the procedure card on the Aesthetics form needs a re-scroll
back up after selecting "Breast augmentation — implant" to render the
ImplantDetailsCard below it, and Maestro coordinate-tap on the case-pill
nav consistently misfired. Not a blocker — the procedure list shows the
implant procedure selected, and the per-procedure team-footer + implant
detail card render below it when expanded. Worth a manual on-device pass
to verify, but the underlying code paths (procedure picklist
`hasImplant: true` triggering `JointImplantSection` rendering) are tested
by the existing 44-test `jointImplant.test.ts` suite.

---

## Findings — triaged (Broken / Wrong / Uncomfortable / Inconsistent / Unpolished)

### 🟡 Wrong — BCRL lymphoedema TNM-vs-ISL staging (REPORTED, server-side, untouched)

Carried forward from session 3 — out of scope per the brief's "do not
touch `server/`" guardrail. `Breast cancer-related lymphoedema — upper
limb` (`lymph_dx_bcrl_upper`) and `… — breast/trunk` (`lymph_dx_bcrl_breast`)
render the **TNM T Stage / TNM N Stage** breast-cancer staging block
instead of the **ISL Stage** every other lymphoedema diagnosis correctly
shows. Root cause documented in `REPORT-session3.md`: `getStagingForDiagnosis()`
in `server/diagnosisStagingConfig.ts` does a keyword `.find()` after a
SNOMED exact-match miss, and "breast cancer" appears in both the TNM
config and the BCRL displayName. Suggested fix (for a future server
session): add `449620005` (Lymphedema of upper limb) and any other
secondary-cancer lymphoedema SNOMED codes to the ISL config's
`snomedCtCodes` array so the exact-match branch resolves correctly
before keyword fallback fires.

### 🟡 Onboarding has no PIN-skip (REPORTED — needs your product call)

Carried forward from session 3 and now documented in CLAUDE.md per
Cluster 3. **`SecurityScreen` has no skip / "set up later" affordance** —
`handleComplete` (which calls `updateProfile({onboardingComplete:true})`
and exits the onboarding stack) only runs after a PIN is set + confirmed.
Every preceding step has an explicit skip link. So onboarding cannot be
*completed* without setting an app-lock PIN. May be intentional for a
PHI-bearing medical app, but it's worth confirming.

### 🟢 Deferred test verification — HeadNeck re-render fix

Cluster 4 wraps the picker in `React.memo`. The kAXError proneness
under Maestro was the original symptom, but the audit can't directly
test for that. The mechanical perf benefit is real (re-renders on
no-op prop changes stop). Worth a manual on-device "rapid tap through
the Head & Neck case form" pass to confirm jank improvement.

### 🟢 Vestigial code after PlanCase deletion (REPORTED — future cleanup)

- `getPlannedCases` / `getPlannedCaseCount` in `dashboardSelectors.ts` no
  longer have production callers (only their tests + the deleted
  PlannedCaseListScreen). Kept for the in-form `isPlanMode` toggle that
  still produces `caseStatus: "planned"`.
- `plannedTemplateId` on `Case` / `CaseSummary` is write-never after the
  deletion (was only set by `PlanCaseScreen.tsx`). Kept as an optional
  vestigial field for now — removing it touches typed JSON storage.

### Inconsistent / Unpolished — catalogued for your design pass

Carried forward from sessions 2–3 — re-verified visually but not relitigated
this session:

- **Nav-pill labels ellipsis-truncate** ("Oper…" / "Outc…") at iPhone 17
  width (402 pt). Phase 7's short-label breakpoint only triggers ≤375 pt;
  402 pt gets the full labels which then don't fit. Reproduced again in
  `s4-deep-03-aesthetics-form` and `s4-deep-04-aesthetics-implantArea`.
- **Chip-text truncation in dense grids** (hand-trauma 3-col Injury Type,
  Personalisation 2-col category cards).
- **AddCase specialty-card content vertical distribution is inconsistent**
  (different cards centre / top-align icon/label/count differently).
- **Episode cards show raw patient identifier** where case cards show a
  name — re-verified in `s4-light-02-needsAttention.png` (AUDIT-SKIN-02
  vs Priya Anand).
- **EpisodeDetail "Change Status" amber fill reads as a selection** — the
  amber-filled "On Hold" next to a green "Active" status badge can be
  misread as "current status = On Hold". Re-verified in
  `s4-light-03-episodeDetail.png`.
- **InfectionEpisodeCard episode-number badge text colour preserved as
  always-white** in Cluster 2b (instead of theme-aware `theme.buttonText`
  which would be dark in dark mode). Flagged for the design pass to
  decide whether dark-on-amber is the correct dark-mode rendering, or
  white-on-amber is intentional.

---

## Coverage & gaps

**Covered this session — full priority list from `NEXT-SESSION-PROMPT.md`:**

- ✅ **Cluster 1 — Dead routes.** Both PlanCase and EpisodeList deleted with
  full reasoning + dead-component sweep alongside.
- ✅ **Cluster 2 — testID + a11y backlog.** All three new gaps fixed
  (ProcedureSubcategoryPicker, AttentionCard, 5 onboarding screens) +
  the pre-existing raw-hex sweep (~70 replacements across 23 files) +
  case-form Pressable a11y sweep across 7 files.
- ✅ **Cluster 3 — CLAUDE.md screen-map.** 5-step onboarding documented,
  no-PIN-skip caveat called out, dead routes removed from table,
  screen counts updated.
- ✅ **Cluster 4 — HeadNeck re-render.** Investigated, React.memo fix
  applied; verification of kAXError improvement deferred to manual
  on-device.
- ◑ **Cluster 5 — Light-theme captures.** Got the high-value missing
  surfaces (dashboard / NeedsAttentionList / EpisodeDetail / Settings
  top). Settings sub-screens (EditProfile / ManageFacilities / etc.)
  in light not captured — low risk per session-3 consistency findings.
- ◑ **Cluster 6 — Deeper module coverage.** Got CaseDetail (Surgical
  Team + 30-Day Review fixes verified) + Aesthetics form entry +
  Aesthetics operative section showing new chip a11y. Did NOT reach
  the deepest `ImplantDetailsCard` for Aesthetics breast augmentation
  implant — coordinate-tap on the case-pill nav after deep scroll
  misfired. Code path is tested (`jointImplant.test.ts` × 44).

**Honest gaps — recommended follow-ups for a future session:**

- **BCRL lymphoedema TNM-vs-ISL staging bug.** Needs a server session
  to edit `server/diagnosisStagingConfig.ts` per the suggested fix in
  session 3 (add `449620005` to ISL config's `snomedCtCodes`).
- **Onboarding PIN-skip product call.** Either accept that medical-app
  onboarding requires PIN setup (and document the design intent on
  `SecurityScreen` itself), or add a "Set up later" affordance for
  consistency with other steps.
- **The Inconsistent / Unpolished design-pass list above.** None of these
  are objective defects — each is a deliberate design call that needs
  your eye.
- **Light theme sub-screens deferred from this session** — EditProfile /
  ManageFacilities / SurgicalPreferences / TeamContacts / SetupAppLock /
  SharedInbox. Low priority — the app follows system appearance
  consistently on every surface sampled so far.
- **Vestigial code after PlanCase deletion** — `getPlannedCases` /
  `getPlannedCaseCount` + `plannedTemplateId`. Either re-wire to a new
  "Planned Cases" filter chip or delete. The 6-osmotic-test
  `plannedCase.test.ts` would also lose its meaning if these are deleted.
- **Deeper Aesthetics ImplantDetailsCard capture** — left for a manual
  on-device pass; the code path is unit-tested.
- **React DevTools re-render highlighting** to definitively verify the
  HeadNeck React.memo perf win. Hard to script — best done manually.
