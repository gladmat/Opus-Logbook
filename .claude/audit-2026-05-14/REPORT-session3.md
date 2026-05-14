# Opus visual + functional audit — 2026-05-14 (Session 3)

**Continuation of** `REPORT-session2.md` / `REPORT.md` / `NEXT-SESSION-PROMPT.md`.
**App version under test:** 2.7.0 + Phase 7.1 follow-ups + session-2 commits + this session's commits.
**Build flavour:** Debug, iOS Simulator (iPhone 17, iOS 26.4, UDID `6AF34D12-…B00A`).
**API target:** Local dev server `http://127.0.0.1:5001`, local Postgres `surgical_logbook`.
**Tooling:** `xcrun simctl` for screenshots, Maestro 2.5.1 for navigation, `xcrun simctl ui … appearance` for theme.

---

## TL;DR

_(written at session end)_

---

## Tooling notes — what changed since session 2 (READ FIRST next session)

Maestro was updated **2.0.2 → 2.5.1** between sessions. This changed tap behaviour and
forced new working patterns. The proven session-3 method:

- **`retryTapIfNoChange: false` is mandatory on toggle-type elements.** Maestro 2.5.1's
  default `tapOn` retries the tap if it doesn't detect a screen change. The dashboard FAB
  (`dashboard.fab.btn-main`) is a toggle — the retry *re-closes* it. Every tap on the FAB,
  on selection chips, on the personalisation "Select all" button, etc. must pass
  `retryTapIfNoChange: false`. This was the single biggest source of friction at session start.
- **Robust FAB-open pattern:** `tapOn fab.btn-main (retryTapIfNoChange:false)` →
  `runFlow when notVisible fab.btn-log: tap again` → `assertVisible fab.btn-log`. The
  conditional retry self-heals both failure modes (tap didn't register / tap toggled it shut).
- **LogBox dev banner — dismiss via its × at point `94%,93%`.** The banner
  (`accessibilityText` = `"!, Open debugger to view warnings."`, bounds `[10,787][392,835]`)
  overlaps the tab bar and blocks tab taps. Detect with `text: ".*Open debugger.*"` (Maestro
  regex must match the *entire* accessibilityText — the `!, ` prefix means a bare
  `"Open debugger…"` string fails to match). Tapping point `94%,93%` hits the × and
  dismisses it. **It re-appears on navigation** (new runtime warnings fire) — re-dismiss
  before screenshots where the bottom 48 pt matters.
- **`kAXErrorInvalidUIElement` (HTTP 500 on `viewHierarchy`) crashes — and HANGS — Maestro.**
  Intermittent; happens when the accessibility tree is queried mid-re-render (worse right
  after navigation, and when the LogBox banner appears/disappears). `waitForAnimationToEnd`
  guards reduce but don't eliminate it. The java process *hangs* on the post-error
  screenshot rather than exiting — a plain `for`-loop batch will stall forever. **Use
  `/tmp/audit-flows/run.sh`**: per-flow `perl alarm` hard timeout (130 s) + `pkill -9` of
  `maestro.cli.AppKt` / `xcodebuild test-without-building` between flows + one retry.
- **The case form persists drafts PER SPECIALTY** (`getCaseDraft(specialty)` in
  `useCaseDraft.ts`). Re-running a specialty flow inherits the previous run's selections.
  Every specialty flow must clear the draft first: `tapOn caseForm.header.btn-overflow` →
  `tapOn text:"Clear Form"` (iOS `ActionSheetIOS`, options `["Clear Form","Cancel"]`).
- Per session 2: every flow starts with `launchApp`; `expo-mcp` automation tools are not
  registered; theme via `xcrun simctl ui booted appearance light|dark`.

---

## Commits landed this session

| Commit | Summary |
|---|---|
| `814cdaa` | Add testID + a11y to HandTraumaAssessment incident laterality buttons + `caseForm.btn-review` (Code fix 1) |
| `74d766c` | Cluster 1 — 11 specialty assessment modules captured + report |
| `1e892fb` | Clusters 4 / 2 / 7 — Settings sub-screens, iPhone SE 3 pass, onboarding (pre-auth) |
| `eb6600c` | Cluster 5 — `screen-*` root testID on all conditional branches of OpusCamera / SmartImport (Code fix 2) |
| `54e8157` | Add dev-only `opus://debug/seed` deep link for audit fixture data (6 cases + 1 episode) |
| `955850a` | **Fix RoleBadge full-width render + 30-day countdown TZ drift** (Code fixes 3/4); extend audit seed 6 → 22 cases (Code fix 5) |
| _(this report + Cluster-6 seeded screenshots)_ | committed progressively through session end |

---

## Code fixes — inline this session

### 1. HandTraumaAssessment incident laterality buttons — missing testID + a11y (Wrong/Uncomfortable)

**File:** `client/components/hand-trauma/HandTraumaAssessment.tsx` (~line 1139).

The "1. Incident → Laterality" Left hand / Right hand `Pressable`s had **no `testID`, no
`accessibilityRole`, no `accessibilityLabel`, no `accessibilityState`**. For a
screen-reader user these are unlabeled buttons; for the audit they blocked automated
navigation of the single densest module in the app. The acute/elective laterality
selector in `DiagnosisGroupEditor.tsx:2891` already uses
`caseForm.hand.chip-laterality-${side}` and is **mutually exclusive** with the trauma one
(trauma vs acute/elective gate — confirmed by the in-code comment at
`DiagnosisGroupEditor.tsx:2859`), so the trauma buttons now use the same testID
convention plus `accessibilityRole="button"` / `accessibilityLabel` / `accessibilityState`.

### 2. Capture screens — `screen-*` root testID missing on conditional branches (Wrong)

**Files:** `client/screens/OpusCameraScreen.tsx`, `client/screens/SmartImportScreen.tsx`.
**Fixed in:** `eb6600c`.

`OpusCameraScreen` carried `testID="screen-opusCamera"` **only on the viewfinder
branch**. Its three conditional early returns — `!permission` (loading spinner),
`!permission.granted` (camera-access-required screen), `!showViewfinder` (template
picker) — had no `screen-*` testID at all. `SmartImportScreen` had the same shape:
`testID="screen-smartImport"` was only on the post-pick branch, not on the
`phase === "picking"` host view (lines 318–320, the blank `<ThemedView>` shown while the
iOS system picker loads on top).

This is the **identical defect class session 2 fixed on `StatisticsScreen`** — a screen
whose `screen-*` landmark exists in some render states but not others, so the audit (and
any Maestro regression flow) can't assert the screen in every state. Added the testID to
all four branches; since the branches are mutually exclusive only one renders at a time,
so no duplicate-testID collision. Rendering is unchanged (testID is an invisible prop) —
`tsc --noEmit` clean.

### 3. RoleBadge stretched to full width inside column layouts (Wrong)

**File:** `client/components/RoleBadge.tsx`. **Fixed in:** `955850a`.

`RoleBadge`'s base `badge` style had no `alignSelf`. Inside a column-direction
parent — `CaseDetailScreen`'s "Surgical Team" `memberInfo` View — the default
`alignItems: "stretch"` made the badge stretch to the full card width, so the
"● PS" role chip rendered as a wide, empty-looking pill (a near-`TextInput`
lookalike) on **every** CaseDetail screen — see the pre-fix `s3-data-31` /
`-41` / `-51`. Added `alignSelf: "flex-start"` to the base style so the chip
sizes to its content. The four other call sites (`CaseDetailScreen` hero
badges, per-procedure role, `CaseCard`) are all row-layout where the badge
already sized to content on the main axis; `alignSelf` only changes their
cross-axis (vertical) alignment from stretch→top, which removes a latent
vertical-stretch on multi-line procedure rows — an improvement, not a
regression. Verified on-device post-fix (`s3-data-31`): compact chip.

### 4. CaseDetail 30-day complication-review countdown drifted by a day (Wrong)

**File:** `client/screens/CaseDetailScreen.tsx`. **Fixed in:** `955850a`.

`daysSinceProcedure` was `Math.floor((Date.now() - new Date(caseData.procedureDate).getTime()) / DAY)`.
`new Date("YYYY-MM-DD")` parses as **UTC midnight**, so subtracting a wall-clock
`Date.now()` drifts the result by a day in any non-UTC zone — exactly the
date-handling anti-pattern CLAUDE.md documents (the ESLint `no-restricted-syntax`
rule only catches the *string-literal* form, not `new Date(variable)`). On the
NZ sim the "30-Day Complication Review" card read **one day high**: the POD-2
breast case showed "Review available in 29 days" (should be 28), the 20-day-old
ortho case showed "11 days" (should be 10). The same `daysSinceProcedure` also
gates `isPending30DayReview` (`>= 30`), so the RACS-MALT audit prompt fired a
day late. Replaced with a timezone-stable local-midnight calendar-day diff via
`parseIsoDateValue`. Verified on-device post-fix: breast → "28 days"
(`s3-data-32`), ortho → "10 days" (`s3-data-52`).

### 5. Audit seed extended 6 → 22 cases (audit infrastructure)

**File:** `client/lib/devSeed.ts`. **Committed in:** `955850a`.

The Statistics tab hides its analytics view behind a 20-case threshold
(`StatisticsScreen` `EMPTY_THRESHOLD = 20`) — a deliberate product gate, **not
a bug**. Session 3's 6-case `opus://debug/seed` fixture therefore could never
reach populated Statistics; the original `s3-data-70..74` "statistics-populated"
shots were all the `EmptyStatistics` progress state (mislabeled). Extended the
`__DEV__`-gated seeder with 16 filler cases (varied specialty / operative role /
facility / month spread over ~6 months) so the fixture set clears the gate and
the charts, deltas, milestone timeline, facility + role breakdowns render
non-trivially. Tree-shakes from production. Re-captured `s3-data-70..75`.

---

## Findings — triaged (Broken / Wrong / Uncomfortable / Inconsistent / Unpolished)

### 🟡 Wrong — BCRL lymphoedema diagnoses show breast-cancer TNM staging instead of ISL

**Severity: Wrong (clinically incorrect data capture). Server-side — REPORTED, not fixed
(brief forbids touching `server/`).**

`Breast cancer-related lymphoedema — upper limb` (`lymph_dx_bcrl_upper`) and
`Breast cancer-related lymphoedema — breast/trunk` (`lymph_dx_bcrl_breast`) render the
**TNM T Stage / TNM N Stage** breast-cancer staging block under "Classification /
Staging" (confirmed on-screen — see `s3-lymph-02-selected.png`), instead of the **ISL
Stage** that every other lymphoedema diagnosis correctly shows and that CLAUDE.md's
Lymphoedema "Data Flow" mandates ("ISL required, Cheng/ICG optional").

**Root cause** (`server/diagnosisStagingConfig.ts` → `getStagingForDiagnosis()`):
1. The function first tries an exact `snomedCtCodes` match. The BCRL diagnoses carry
   `snomedCtCode: "449620005"` (Lymphedema of upper limb), which is **not** in the ISL
   config's `snomedCtCodes` list (`234097001`, `402672004`, `445710004`, …) — so no
   exact match.
2. It falls back to keyword matching via `Array.find()`. The TNM config (defined ~line
   180, keywords `["breast cancer", "breast carcinoma", "mammary carcinoma"]`) appears in
   the array **before** the ISL config (~line 407, keywords `["lymphoedema", …]`). The
   displayName "Breast cancer-related lymphoedema — upper limb" contains *both* "breast
   cancer" *and* "lymphoedema" — `.find()` returns the first hit → **TNM wins**.

**Suggested fix (for a future server session):** add `449620005` (and any other
secondary-cancer lymphoedema SNOMED codes) to the ISL config's `snomedCtCodes` so the
exact-match branch resolves correctly before the keyword fallback can mis-fire. The
4 non-breast post-cancer lymphoedema diagnoses ("Post-gynaecological cancer…", etc.) are
**not** affected — their names don't contain a TNM keyword, so they fall through to the
"lymphoedema" keyword and get ISL correctly.

### 🟡 Dead route — `PlanCase` screen is registered but unreachable

**Severity: Wrong (dead code / lost feature). Reported, not fixed — needs a judgment
call on whether to wire it up or delete it.** `PlanCaseScreen` is a fully-implemented
screen (`client/screens/PlanCaseScreen.tsx` — save logic, camera integration,
`testID="screen-planCase"`) and is registered as the `PlanCase` route in
`RootStackNavigator.tsx:893`. **Nothing in the codebase ever calls
`navigation.navigate("PlanCase")`** — an exhaustive case-insensitive grep across
`client/` + `server/` finds only the route definition + the screen's own file. The
route is dead.

Most likely explanation: "plan mode" was folded into the regular case form (there's a
`caseForm.patient.toggle-planMode` toggle + `caseForm.planModeBanner` + the
`PlanModeBanner` component from Phase 7), which **superseded** the standalone
`PlanCaseScreen` — but the orphaned screen + route were never removed. The 2.6.0 Code
Audit & Remediation pass removed several dead-code files; this one looks like it slipped
through. Decision needed: delete `PlanCaseScreen.tsx` + the route, or (less likely) it
was meant to stay reachable and lost its entry point in a refactor.

### 🟡 Dead route — `EpisodeList` screen is registered but unreachable

**Severity: Wrong (dead code / lost feature). Reported, not fixed — same
delete-or-wire-up call as `PlanCase`.** `EpisodeListScreen`
(`client/screens/EpisodeListScreen.tsx` — full SectionList implementation,
`screen-episodeList` testID, `episodes.input-search`) is registered as the
`EpisodeList` route in `RootStackNavigator.tsx:791`. **Nothing in the codebase
calls `navigation.navigate("EpisodeList")`** — an exhaustive grep across
`client/` + `server/` + `shared/` finds only the route definition, the
param-list type, the import, and two doc comments that merely *name*
"EpisodeList/Detail" as audit scope. `EpisodeDetail` **is** reachable (dashboard
attention carousel, NeedsAttentionList) and was captured this session; the
list-level screen is orphaned. This is the **second** dead route found
(`PlanCase` is the first) — both look like entry points lost in a refactor. A
dedicated pass should decide delete-vs-rewire for both together.

### 🟢 Possible perf — `HeadNeckDiagnosisPicker` is unusually `kAXErrorInvalidUIElement`-prone

**Severity: low / needs-investigation. Reported only.** Every Maestro hierarchy query
against the Head & Neck case form (`scrollUntilVisible` *and* a plain `tapOn` on a
visible `caseForm.headNeck.chip-subcat-*`) intermittently throws
`kAXErrorInvalidUIElement` ("element frame invalid") — far more often than any other
specialty's picker. `kAXErrorInvalidUIElement` means the element reference went stale
between query and frame-read, which usually points to **the view re-rendering
continuously**. The other 10 specialties' pickers were automatable; only
`HeadNeckDiagnosisPicker` consistently fought back. Worth a React-DevTools "highlight
re-renders" pass on `client/components/head-neck/HeadNeckDiagnosisPicker.tsx` — if it's
re-rendering on a loop, that's a real perf bug (jank on the 88-diagnosis picker) hiding
behind the automation friction. The picker *renders* fine visually (`s3-headneck-01`).

### 🟢 Testability — `ProcedureSubcategoryPicker` procedure rows have no `testID`

**Severity: low (testability/a11y gap). Reported, not fixed — it's part of the broader
case-form-a11y backlog, not a one-line fix.** `client/components/ProcedureSubcategoryPicker.tsx`
renders its procedure-list rows (used by the Aesthetics procedure-first flow, breast +
H&N `CompactProcedureList`, and the standard procedure subcategory picker) as
`Pressable`s with **no `testID` and no `accessibilityRole`/`accessibilityLabel`**. The
favourites/recents chips above them are fine; the main list rows are not. This blocked
deep automation of the aesthetics module and is an a11y gap for screen-reader users.
Recommend a dedicated pass adding `caseForm.procedure.row-${entry.id}` + button role +
label.

### 🟢 Testability — dashboard `AttentionCard` + the 4 onboarding screens have no `testID`s

**Severity: low (testability/a11y gap). Reported, not fixed — backlog, not a
one-line fix.** Two more testID-less surfaces surfaced while driving the
seeded-data and onboarding clusters:

- **`client/components/dashboard/AttentionCard.tsx`** — the card component
  itself has zero `testID`s on any of its `Pressable`s (the card body, the
  Histology / + Event / Discharge / View-episode quick actions). The
  `NeedsAttentionCarousel` wrapper does expose `dashboard.attention.card-${index}`
  per item, but a horizontally-scrolled carousel only makes index 0 hittable —
  capturing `EpisodeDetail` from the dashboard needed a coordinate fallback.
- **`CategoriesScreen` / `TrainingScreen` / `HospitalScreen` / `PrivacyScreen`**
  (the four post-auth onboarding steps) — `grep` finds **no `testID` anywhere**
  in any of them, despite CLAUDE.md's screen map citing `onboarding.*` testIDs.
  Onboarding had to be driven entirely by visible-text taps.

Both are part of the broader testID/a11y backlog; recommend folding into the
same dedicated pass as `ProcedureSubcategoryPicker`.

### Inconsistent / Unpolished — catalogued for Mateusz's design pass

- **Nav-pill labels ellipsis-truncate ("Oper…" / "Outc…")** — confirmed reproduces on
  iPhone 17 in both themes (session-2 finding #s2 carried forward). `SectionNavBar`'s
  short-label breakpoint only triggers ≤375 pt; 402 pt gets the full labels which don't
  fit. Design call — do not redesign autonomously.
- **Chip-text truncation in dense grids** — the hand-trauma "Injury Type" 3-column grid
  ("Dislocati…", "Soft Tiss…", "Amputat…"), the Personalisation 2-column category cards
  ("Cleft & Craniof…", "Orthoplastic &…"), the AddCase specialty grid. Likely an
  intentional fixed-grid constraint, but worth a deliberate call.
- **AddCase specialty-card content vertical distribution is inconsistent** — within an
  equal-height row, one card bunches icon/label/count at the top while its sibling
  spreads them out (e.g. Skin Cancer vs Orthoplastic). Centre or top-align consistently.
- **Episode cards show the raw patient identifier where case cards show a name** — the
  Needs-Attention / NeedsAttentionList episode card titles with `patientIdentifier`
  (`"AUDIT-SKIN-02"`) while the sibling inpatient card titles with the patient's name
  (`"Priya Anand"`). The episode could resolve the linked case's name; the raw code
  reads as unfinished next to the named card. (`s3-data-20`, `s3-data-60`.)
- **EpisodeDetail "Change Status" amber fill reads as a selection** — the episode status
  badge says `Active`, but in the "Change Status" row the first action ("On Hold")
  renders amber-filled while "Completed" / "Cancelled" are outlined. The amber fill is
  button-hierarchy styling, but next to an `Active` badge it can be misread as "current
  status = On Hold". Consider an explicit current-status indicator or uniform button
  styling. (`s3-data-60`.)
- **Statistics horizontal-bar labels truncate** — "Orthoplastic & Li…" in Practice
  Profile, "Auckland City Ho…" in Where You Operate. This is `HorizontalBarChart`'s
  documented `ellipsizeMode="tail"` behaviour, so it is *correct by spec* — flagged only
  so the design pass can decide whether the longer specialty/facility names deserve a
  wider label column or a two-line wrap. (`s3-data-70`, `s3-data-72`.)

---

## Specialty assessment modules — captured WITH a diagnosis selected (Cluster 1)

This was the brief's priority #1: the prior sessions captured only the diagnosis
*pickers*; this session drove each specialty's case form, selected a representative
diagnosis, and screenshotted the rendered assessment module + scrolled through it.

| Specialty | Diagnosis driven | Module | Shots | Assessment |
|---|---|---|---|---|
| Hand — Trauma | Trauma → Left hand → Fracture | HandTraumaAssessment | `s3-hand-01..05` | ✅ Renders clean. Incident → Injured Structures → Fracture Classification → AO bone cards (Carpal 71-76 / Metacarpal 77 / Phalanx 78) → mapped-procedures. Amber module border correct. *Injury-type chip grid truncates labels (see Inconsistent).* |
| Burns | Acute burn | BurnsAssessment | `s3-burns-01..05` | ✅ Renders clean. Depth + TBSA staging → TBSA Assessment (regions, steppers) → Injury Event (mechanism, intent, place-of-injury chips, toggles) → Referral Source → suggested procedures. Comprehensive, on-brand. |
| Orthoplastic | Open fracture — lower leg | (diagnosis + Gustilo staging) | `s3-ortho-01..04` | ✅ Renders clean. Gustilo-Anderson staging + Laterality + procedures. No bespoke "assessment module" — standard diagnosis+staging surface, correct by design. |
| Peripheral Nerve | Median nerve injury | PeripheralNerveAssessment | `s3-pnerve-01..05` | ✅ Renders clean. Amber module, Left/Right inside, 1. Nerve Injured (region-filtered nerve chips + branches) → Electrodiagnostics / Intraoperative Findings (collapsed) → Repair/Reconstruction (timing + technique chips). |
| Lymphoedema | BCRL — upper limb | LymphaticAssessment | `s3-lymph-01..05` | ✅ Module renders clean (Affected Region, Bioimpedance, Limb Measurements, Clinical History, LVA Operative Details). 🟡 **but the staging block above it is wrong — TNM instead of ISL (see Findings).** |
| Cleft & Craniofacial | Cleft lip — unilateral incomplete | CraniofacialAssessment | `s3-cleft-01..04` | ✅ Renders clean. Cleft Classification (LAHSHAL 6-position input, Veau I-IV/SM) → Laterality + Associated features toggles → Operative Details (age auto-compute, pathway stage). |
| Skin Cancer | Melanoma | SkinCancerAssessment | `s3-skincancer-01..05` | ✅ Renders clean per the locked design — 1. Diagnosis (+ inline quick-Breslow row) → 2. Prior Histology → 3. Lesion (body-wide site picker, laterality, clinical size) → 4. Excision (WLE/Mohs, peripheral margin) → 5. Summary. SLNB / full melanoma panel correctly *not* shown until Breslow > 0.8 mm entered — progressive disclosure working. |
| Aesthetics | Breast augmentation — implant (procedure-first) | AestheticProcedureFirstFlow | `s3-aesthetics-01..04` | ✅ Procedure-first picker renders clean (subcategory chips + procedure list w/ favourite stars) → "Selected Procedures" row. *The deeper product-detail card (ImplantDetailsCard) was not reached by the flow — minor coverage gap, not a defect.* `ProcedureSubcategoryPicker` rows lack `testID`s (testability gap — see Findings). |
| Hand — Acute | Septic flexor tenosynovitis | AcuteHandAssessment / HandInfectionCard | `s3-handacute-01..04` | ✅ Renders clean. Case-type Acute → Laterality → 1. Diagnosis → 2. Infection Details (HandInfectionCard: affected digits, Kanavel signs toggles, 4-layer disclosure). |
| Hand — Elective | Dupuytren's contracture — primary | HandElectivePicker / DupuytrenAssessment | `s3-handelective-01..05` | ✅ Renders clean. Case-type Elective → Laterality → 1. Diagnosis → 2. Classification (affected-finger ray chips, first-web-space, palm involvement, diathesis) → 3. Summary. |
| Head & Neck | Mandible fracture | HeadNeckDiagnosisPicker | `s3-headneck-01..05` | ✅ Picker renders clean (search + 9 subcategory chips + per-subcat diagnosis chips). _Module-with-diagnosis re-captured scroll-free after kAXError failures — see Tooling notes._ |
| Breast | Breast Ca invasive | BreastProgressiveAssessment | `s3-breast-01..04` | ✅ Renders clean — 1. Breast Assessment (Left/Right/Bilateral, per-side Clinical Context, Reconstruction Timing) → 2. Diagnosis (oncological / reconstruction chip groups). _Re-captured after the initial flow's laterality-tap toggled the pre-selected "Left" off._ |
| General | Necrotizing fasciitis — trunk | (no bespoke module — by design) | `s3-general-01..04` | ✅ Renders clean. Diagnosis → Laterality → Procedures Performed → Suggested Procedures. General correctly has no specialty assessment module (CLAUDE.md locked decision). |

**Headline:** **every one of the 11 specialty assessment modules renders cleanly** —
correct amber module border, theme tokens, progressive disclosure behaving per the
locked designs, no Broken/Wrong layout issues *in the module chrome itself*. The
substantive finding from this cluster is the **lymphoedema TNM-staging bug** (a
data-correctness issue, not a layout one). This is a strong result for the densest
custom UI in the app.

## Settings sub-screens (Cluster 4) — all clean

All 6 audited Settings sub-screens render cleanly on iPhone 17 / dark — on-brand, theme
tokens, good empty states, no Broken/Wrong/Uncomfortable issues. The 6 flows passed
first-try with no kAXError retries (Settings is a calmer surface than the case form).

| Screen | Shots | Assessment |
|---|---|---|
| Edit Profile | `s3-settings-editprofile-01..02` | ✅ Avatar + "Add Photo", Personal Details (name, DOB, Sex segmented), Professional Details. Clean. |
| My Hospitals (ManageFacilities) | `s3-settings-facilities-01..02` | ✅ "Add from curated list", country chip, SELECTED list with PRIMARY badge + "Make primary" + delete ×. Clean. |
| Surgical Preferences | `s3-settings-surgprefs-01..02` | ✅ Microsurgery → Anticoagulation Protocol radio cards with sub-detail bullets. Clean, well-structured. |
| My Operative Team (TeamContacts) | `s3-settings-teamcontacts-01..02` | ✅ "No team members yet" empty state (icon + copy) + FAB. Clean. |
| App Lock (SetupAppLock) | `s3-settings-applock-01..02` | ✅ "Set Up PIN" row, lock icon, 6-digit-PIN copy, chevron. Clean. |
| Shared Cases (SharedInbox) | `s3-settings-sharedcases-01..02` | ✅ "No shared cases yet" empty state. Clean. |

## iPhone SE 3 / 375 pt pass (Cluster 2)

Created a fresh `iPhone SE (3rd generation)` simulator
(`87C2B2A6-7E6A-446E-BA2F-789B5DB9E74F`, iOS 26.4) and installed the **existing**
`Debug-iphonesimulator` `Opus.app` on it — sim builds are not device-specific, so **no
rebuild was needed** (this resolves session 2's "SE-3 needs its own native build"
concern). The SE 3 booted in **light appearance**, so this pass doubles as light-theme
coverage (Cluster 8).

| SE 3 screen | Shot | Assessment |
|---|---|---|
| Dashboard (empty) | `s3-se3-01-dashboard` | ✅ Clean at 375 pt / light. Logo lockup, All(0) chip, inbox/search, empty state, FAB, tab bar — all fit. |
| FAB speed dial | `s3-se3-02-fab` | ✅ |
| Add Case grid | `s3-se3-03-addcase` | ✅ 2-col specialty grid fits at 375 pt. |
| Case form — Patient | `s3-se3-04-caseform-patient` | ✅ Patient section fits; procedure date auto-fills today, facility auto-fills primary (Waikato). |
| Case form — Case | `s3-se3-05-caseform-case` | ✅ |

**SectionNavBar at 375 pt — the session-2 finding, re-checked here first as instructed:**
At 375 pt the nav bar renders **`Patient · Team · Case · Op · Media · Outc`** — i.e.
Phase 7's short-label breakpoint **does** engage at ≤375 pt (good — "Operative"→"Op",
"Outcomes"→"Outc"). So the nav-pill defect is **specifically the 376–402 pt band**: there
the full labels are used but don't fit, so they ellipsis-truncate to "Oper…"/"Outc…"
(ugly). The fix is to widen the short-label breakpoint to cover iPhone 17 width too —
**this confirms and localises the session-2 finding.** One thing to eyeball on a real
SE 3: the last pill ("Outc") sits flush against the right screen edge in
`s3-se3-04` — verify it isn't a hair clipped.

## Onboarding flow (Cluster 7) — pre-auth captured on the fresh SE 3 install

The fresh SE 3 install starts at the onboarding entry, so it doubled as the Cluster 7
capture (375 pt / light): `s3-onboard-01-welcome-se3` (Welcome — "Your life's work,
documented." + Get Started) → `s3-onboard-02..05` (FeaturePager — "Log any case in
under 60 seconds", registry-superset slide w/ ISCP/FEBOPRAS/BSSH/RACS/NMBRA chips, etc.)
→ `s3-onboard-06/07` (last FeaturePager slide + sign-in). All render cleanly.

**Gap:** the *post-auth* onboarding steps (Categories → Training → Hospital → Privacy)
were **not** reachable — `onboardingComplete` is read from the server `profile`
(`AuthContext.tsx:540`), and the audit test account has it `true`, so a deep-link login
jumps straight past them to the dashboard. Capturing those four needs a *fresh,
not-yet-onboarded* server account (creating one hits the EmailSignup Strong-Password
issue from session 1). Left for a future session.

## Capture screens (Cluster 5)

Camera permission was granted (`xcrun simctl privacy booted grant camera com.drgladysz.opus`)
and each capture surface driven and screenshotted on iPhone 17 / dark.

| Screen | Shot | Assessment |
|---|---|---|
| Opus Camera — Quick Snap | `s3-capture-01-opuscamera` | ✅ Clean. Full-bleed black viewfinder, "Quick Snap" + "0 photos" header, white shutter ring, Done button, flash + camera-flip controls bottom-right. On-brand minimal camera chrome. |
| Guided Capture | `s3-capture-03-guidedcapture` | ✅ Clean. Cancel / "Guided Capture" header, required Patient Identifier field, Capture Template list (Free Flap 11 steps / Skin Cancer Excision 7 / Aesthetic Rhinoplasty/Face/Breast/Body Contouring / Hand Surgery Functional 12) with per-template step counts. Theme tokens correct. |
| Photo Inbox | `s3-capture-05-inbox` | ✅ Clean. "Photo Inbox is Empty" empty state — inbox icon, two-line copy, amber **Opus Camera** primary + neutral **Camera Roll** secondary CTA pair. Matches the empty-state spec. |
| Smart Import | `s3-capture-06-smartimport` | ✅ Correct-by-design. Renders as a **blank host view** under the "Import Photos" nav header — this is the intentional `phase === "picking"` state (`SmartImportScreen.tsx:318`): the screen mounts, then `InteractionManager.runAfterInteractions` + 100 ms launches the iOS system photo picker *on top*. Cancelling the picker calls `navigation.goBack()`. The blank frame is the host, not a defect. (The `phase === "picking"` branch's missing root testID **was** a defect — fixed, see Code fix 2.) |
| Plan Case | _(not captured — dead route)_ | `PlanCaseScreen` is fully implemented + registered as the `PlanCase` route, but **nothing in the codebase calls `navigation.navigate("PlanCase")`** — see Findings → "Dead route". Unreachable through the UI, so not screenshottable through normal navigation. |

**Headline:** all four *reachable* capture screens render cleanly and on-brand. The
only capture-cluster issues are non-visual: the `screen-*` testID gap (fixed inline) and
the dead `PlanCase` route (reported — needs a delete-or-wire-up decision).

## Seeded-data run (Cluster 6)

The brief's highest-value cluster: the data-dependent surfaces (CaseDetail,
AddTimelineEvent, AddHistology, EpisodeDetail, NeedsAttentionList, populated
Dashboard + Statistics) need real cases on-device. Session 3 built the
`__DEV__`-gated `opus://debug/seed` deep link (commit `54e8157`) to seed a
varied fixture set without hand-driving the kAXError-prone case form six times.
This cluster ran the seed, captured every data surface, and **caught two real
bugs** that only manifest with data present (RoleBadge full-width, 30-day
countdown TZ drift — both fixed inline, see Code fixes #3/#4). The seed was
extended 6 → 22 cases mid-cluster so populated Statistics could clear its gate
(Code fix #5).

| Screen | Shots | Assessment |
|---|---|---|
| Dashboard (populated) | `s3-data-01..03` | ✅ Clean. Filter chips with counts, Needs Attention carousel (inpatient + episode), Practice Pulse (This Month/Week/Completion with deltas + sparkline), Recent Cases with specialty-tinted thumbnails + role badges + "+ Event". |
| Dashboard (Breast-filtered) | `s3-data-04` | ✅ Clean. All 3 zones recalculate for the specialty per the locked spec — Needs Attention shows only the breast inpatient, Practice Pulse re-derives, the list header becomes "Breast Cases". |
| NeedsAttentionList | `s3-data-20..21` | ✅ Clean. INPATIENTS + ACTIVE EPISODES sections, search field, per-card quick actions. |
| CaseDetail — breast (inpatient, DIEP) | `s3-data-30..34` | ✅ Clean after fix. Hero badges, Procedures Performed (SNOMED rows), Demographics, Admission, Diagnoses, **Surgical Team** (RoleBadge fix verified — compact chip), Responsible Consultant, Operative Factors, 30-Day Review (**TZ fix verified — "28 days"**), Timeline empty state, Delete Case; actions menu (Edit / Duplicate). |
| CaseDetail — skin (episode-linked, awaiting histology) | `s3-data-40..41` | ✅ Clean. Amber "Histology pending" banner + "Add Histology Results" CTA card — good use of warning-surface tokens. |
| AddHistology | `s3-data-42..43` | ✅ Clean. Context card, Pathology Category chips, Histology Report textarea, Margin Status chips, optional SNOMED + Histological Diagnosis inputs, header Save. |
| CaseDetail — ortho (multi-procedure) | `s3-data-50..52` | ✅ Clean. Two numbered procedure cards render correctly; 30-Day Review **TZ fix verified — "10 days"**. |
| AddTimelineEvent | `s3-data-53..54` | ✅ Clean. Modal; Entry Type 7-card grid (Note / Photo / X-ray / PROM / Complication / Follow-up / Wound Assessment). No Cancel button — but its sibling modal `CaseSearch` is the same, so the swipe-to-dismiss pattern is *consistent*, not a per-screen defect. |
| EpisodeDetail | `s3-data-60..62` | ✅ Clean. Status badge, specialty chip, patient/onset/pending-action, 3 stat cards (Cases / Procedures / Span), Change Status row, Case Timeline, "+ Log Case" CTA. |
| Statistics (populated, 22 cases) | `s3-data-70..75` | ✅ Clean — the 22-case seed cleared the 20-case gate. Practice/Training pill bar, hero stats (22 / 5 months / 6 specialties), Practice Profile horizontal bars (specialty-tinted), Monthly Activity bar chart (~6-month spread, highlightLast), Milestone timeline, per-specialty Deep-Dive cards, Where You Operate (2 facilities), Your Role (4 roles, role-tinted), Your Top 10, Data Completeness 100%. |
| EpisodeList | _(not captured — dead route)_ | `EpisodeListScreen` is fully implemented + registered but **unreachable** — nothing calls `navigate("EpisodeList")`. See Findings → "Dead route — EpisodeList". |

**Headline:** every reachable data surface renders cleanly. The cluster's two
substantive findings are the **RoleBadge full-width** and **30-day countdown TZ
drift** bugs — both objective, both fixed + verified on-device this session.
`EpisodeList` is a second dead route (reported). Session 3's original
`s3-data-*` capture had four duplicate-screenshot pairs (`03≈04`, `20≈21`,
`32≈33`, `53≈54`) — `32≈33` / `53≈54` are just "screen too short to scroll
further" (harmless), but `03≈04` meant the **filtered dashboard was never
actually captured** (the flow's chip-tap was `optional:true` against stale
text); that is now genuinely captured (`s3-data-04`).

## Coverage & gaps

_(written at session end)_
