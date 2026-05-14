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
| _(pending)_ | Add testID + a11y to HandTraumaAssessment incident laterality buttons |

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

## Coverage & gaps

_(written at session end)_
