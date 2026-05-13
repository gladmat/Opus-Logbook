# Case Form UX — Follow-up Session Notes

**Sequel to**: `case-form-ux-audit.md` (findings) + `case-form-ux-implementation.md` (Phase 1–3 plan)
**Shipped**: Commit `2d9012a` → Opus 2.7.0, EAS build 11, TestFlight (auto-submit via `eas build --auto-submit`).
**This file** = the state-of-the-art queue. Everything deferred from the audit, plus polish items, ordered by leverage.

When you start the next session: open this file first and pick a working set. Suggested cadence: one focused session per cluster, ~3–4 hours each.

---

## Cluster 1 — OperativeSection 4-collapsible restructure (P3.1)

**Why first**: it's the largest single doc-vs-implementation divergence in the form and the only Phase 3 item we deferred. Once this lands, the form structure matches CLAUDE.md exactly and "Operative Details" feels right on every screen.

**File**: `client/components/case-form/OperativeSection.tsx` (~830 lines)

**Current state** (2.7.0):
- ONE outer `<CollapsibleFormSection title="Operative Details">`
- Inside: 5 `<SectionHeader>` blocks (Role & Supervision, Admission & Timing, Anaesthesia, Surgical Factors, Patient Factors) — none of them collapsible
- "Patient Factors" always rendered (ASA, smoking, height, weight, BMI, comorbidities)
- Filled-count math was upgraded in 2.7.0 to track 15 fields across all 4 logical sub-groups (was 6), but it's still one badge on the outer wrapper

**Target state** (CLAUDE.md spec):
```
<View>
  <CollapsibleFormSection title="Admission & Timing" defaultExpanded
    filledCount={admissionTimingFilled} totalCount={5}>
    {/* urgency, stay type, admission/discharge dates, surgery start/end times */}
  </CollapsibleFormSection>

  <CollapsibleFormSection title="Role & Anaesthesia" defaultExpanded
    filledCount={roleAnaesthesiaFilled} totalCount={3}>
    {/* responsible consultant, operative role, supervision, anaesthetic type */}
  </CollapsibleFormSection>

  <CollapsibleFormSection title="Surgical Factors" defaultExpanded
    filledCount={surgicalFactorsFilled} totalCount={3}>
    {/* wound infection risk, antibiotic, DVT prophylaxis */}
  </CollapsibleFormSection>

  <CollapsibleFormSection title="Patient Factors" defaultExpanded={false}
    filledCount={patientFactorsFilled} totalCount={4}>
    {/* ASA, smoking, height/weight/BMI, comorbidities — conditional */}
  </CollapsibleFormSection>

  {/* ASA Info Modal stays outside the collapsibles */}
  <Modal ... />
</View>
```

**Implementation plan**:
1. The 4 `filledCount` memos already exist at the top of the file (lines 152–195) — reuse them.
2. Reorder the JSX top-down so Admission & Timing renders first.
3. Drop the outer `<CollapsibleFormSection title="Operative Details">` — each sub-group has its own card.
4. Each `<SectionHeader>` → `<CollapsibleFormSection>` with corresponding count.
5. Anaesthesia merges into "Role & Anaesthesia" (currently a stand-alone `<SectionHeader>` for a single picker — folding it into the Role card eliminates the unnecessary 5th sub-group).
6. Patient Factors gets `defaultExpanded={false}`.
7. ASA Info Modal stays at the bottom of the returned tree (it's portaled by RN's `Modal`, doesn't need to live inside any specific collapsible).

**Risk**: ~600 lines of JSX rearrangement. Do this as a single replacement rather than incremental edits — the partial-edit approach failed mid-Phase-3 of this audit. Read the full current return, write the new return from scratch, replace in one Edit call.

**Verification**:
- `npx tsc --noEmit` clean
- Tests pass (no changes to test surface)
- Manual sim: open new case → Operative tab → confirm 4 collapsibles in order, Patient Factors collapsed by default
- Manual sim: enter ASA 3+ → Comorbidities renders inside Patient Factors

---

## Cluster 2 — DiagnosisGroupEditor accessibility long tail

**Why second**: A11y debt is App Store-reviewable and a regulatory concern for clinical apps. Phase 2 covered the highest-traffic case-form interactives; this finishes the ~37 Pressables in DiagnosisGroupEditor that didn't get touched.

**File**: `client/components/DiagnosisGroupEditor.tsx` (~4000 lines)

**Approach**: Grep-driven sweep, not a careful per-element read.

```bash
# Find every Pressable in the file
grep -nE "<Pressable" client/components/DiagnosisGroupEditor.tsx | wc -l   # ~47

# Find the ones missing a11y metadata
grep -nE "<Pressable" client/components/DiagnosisGroupEditor.tsx | head -50
# For each: read the surrounding 10 lines, decide:
#   - accessibilityRole: "button" / "checkbox" / "radio" / "tab"
#   - accessibilityLabel: visible text OR descriptive sentence for icon-only
#   - accessibilityState: { selected } / { checked } / { expanded } / { disabled } as relevant
```

**Pattern targets in DiagnosisGroupEditor**:
- The 3-way case-type pills (Trauma / Acute / Elective) — `accessibilityRole="radio"` + `selected`
- Pathway gate options (skin cancer) — `accessibilityRole="radio"` + `selected`
- Laterality pills (Left / Right / Bilateral inside the trauma assessment) — `accessibilityRole="radio"` + `selected`
- Clinical-suspicion buttons (line ~3491) — `accessibilityRole="button"` + `selected`
- Reorder chevrons on collapsed group header — `accessibilityRole="button"` + `accessibilityLabel="Move up/down"`
- Reorder chevrons on expanded group header (B3.3 below adds these)
- Accept-Mapping buttons (free flap, hand trauma, skin cancer, etc.) — `accessibilityRole="button"`
- The "What's the diagnosis?" reverse-mapping CTA (line ~3265) — `accessibilityRole="button"`
- Add Diagnosis Group + Delete Group buttons (the delete already got it in P1.4)

**Also**: `DiagnosisPicker.tsx`, `ProcedureSuggestions.tsx`, `CompactProcedureList.tsx`, `TreatmentContextSection.tsx`, `ProcedureClinicalDetails.tsx` chips + buttons. Same pattern.

**Verification**: a VoiceOver pass on the case form. Enable iOS Settings → Accessibility → VoiceOver → swipe through the form. Every interactive element should announce role + label + state. Decorative elements (the amber "Primary" badge, completion underlines) should be skipped.

---

## Cluster 3 — Accept-Mapping pattern standardisation (P3.2)

**Why**: The Accept-Mapping flow is the form's best UX pattern (audit win #1) but only 3 modules use it. The other 9 specialty modules either commit silently or have idiosyncratic accept flows. Standardising reduces cognitive load.

**Current state**:
- Hand trauma: explicit `<Pressable>Accept Mapping</Pressable>` → renders `procedureSummaryCard` after accept ✓
- Skin cancer: "Accept mapping" inside `SkinCancerSummaryPanel` → toggles `skinCancerProceduresAccepted` flag, no summary card on return
- Acute hand: same pattern as skin cancer
- Free flap: NO accept button — picking a flap-tagged procedure auto-populates `freeFlapDetails`, immediately renders the `DetailModuleRow` "Flap Details" hub
- Breast: side-by-side cards, no explicit accept
- Hand elective: implicit via diagnosis selection
- Craniofacial, Aesthetic, Burns, Peripheral Nerve, Lymphatic: various

**Plan**:
1. Extract the existing post-accept summary card (`DiagnosisGroupEditor.tsx:3586–3611`) into a new `client/components/case-form/AcceptedMappingCard.tsx` accepting `{ title, procedureChips, onEdit }` props.
2. Wire into every specialty module's accept path:
   - Skin cancer: render after `setSkinCancerProceduresAccepted(true)`
   - Acute hand: same after `setAcuteProceduresAccepted(true)`
   - Free flap: add an explicit "Accept flap setup" button OR auto-show the card the moment `flapType` populates
   - Breast: render after side cards are accepted
   - Others: same pattern, conditional on the module's "committed" flag
3. The card should show: title (e.g. "BCC excision · cheek"), procedure pills, and an "Edit" link that reverts the accept flag

**Risk**: medium. Each module has its own commit-state logic. Easy to miss a module. Do it specialty-by-specialty with sim verification between each.

---

## Cluster 4 — Field-level deep-link from CaseSummaryView (P3.6)

**Why**: When the surgeon taps Edit on a summary card with a warning ("Patient ID required"), they currently land at the section TOP and have to hunt. Patient Info has ~10 fields; Operative has 20+.

**Current state**: `CaseSummaryView.tsx` Edit → `CaseFormScreen.handleEditFromSummary(sectionId)` → `scrollToSection(sectionId)`. Section-level granularity only.

**Plan**:
1. Extend `FormScrollContext` with `registerFieldLayout(fieldId, y)` + `scrollToField(fieldId)`. The provider keeps a `Map<fieldId, y>`.
2. Add an optional `fieldId` prop to `FormField`, `SelectField`, `PickerField`, `DatePickerField` — they call `registerFieldLayout(fieldId, y)` on layout.
3. `SummaryCard` learns to pass `fieldId` to its Edit action (e.g. the patient-identifier warning passes `fieldId="patientIdentifier"`).
4. `handleEditFromSummary` accepts an optional `fieldId` and prefers it: `scrollToField(fieldId)` → fall back to `scrollToSection(sectionId)` if no fieldId.
5. After scrolling, if the field is a text input, focus it: `fieldRef.current?.focus()`.

**Files**: `CaseSummaryView.tsx`, `CaseFormScreen.tsx`, `FormScrollContext.tsx`, `FormField.tsx` + the rest of the field primitives.

**Verification**: Sim — create a case with a required field missing → tap Review Case → hit error → tap Edit on the warning → land directly at the field with keyboard up.

---

## Cluster 5 — Discoverability polish (the deferred Phase 4)

These are smaller items, sequenced by leverage. Pick the top 3–4 for a single 2-hour session.

### 5a. Auto-save indicator (B3.6)
- Add a `theme.textTertiary` "Draft saved 2s ago" or check icon to the header.
- Wire to `useCaseDraft`'s last-save timestamp.
- File: `CaseFormScreen.tsx` header right cluster.

### 5b. Day-case auto-fill announcement (B3.7)
- When `stayType === "day_case"` auto-fills "Discharged home", show a small "Auto" badge next to the outcome with a tap-to-clear affordance.
- Same pattern for any other silent auto-fill (breast IMA/IMV anastomosis pre-fill, donor vessel by flap type).
- Files: `OutcomesSection.tsx`, possibly a shared `<AutoFilledBadge>` component.

### 5c. 30-day RACS audit teaser (B3.5)
- Auto-expand the audit collapsible when `procedureDate >= 30 days old`.
- OR: show a one-line teaser "30-day audit available — tap to record" in the collapsed header.
- File: `OutcomesSection.tsx`.

### 5d. Add Diagnosis Group header CTA (B3.2)
- Mirror the bottom "+ Add Diagnosis Group" button as a small `+` icon next to the section header.
- File: `DiagnosisProcedureSection.tsx`.

### 5e. Reorder chevrons in expanded group state (B3.3)
- Currently visible only on collapsed group header. Show on expanded header's right-cluster too.
- File: `DiagnosisGroupEditor.tsx` (line ~2680 area).

### 5f. Reverse-mapping teaser (B3.11)
- "Pick procedures first? We can suggest a diagnosis ↓" banner above procedure list when no diagnosis is set.
- File: `DiagnosisGroupEditor.tsx`.

### 5g. TreatmentContextSection default-expand for free flap (B3.13)
- `defaultExpanded={isFreeFlapCase}` so radiotherapy + reconstruction timing aren't hidden.
- File: `TreatmentContextSection.tsx`.

### 5h. Operative summary mini-sub-headers (B3.10)
- `CaseSummaryView` renders Operative as a flat 17-row wall — add 4 inner mini-headers matching the in-form 4-collapsible structure (after Cluster 1 lands).
- File: `CaseSummaryView.tsx`.

### 5i. Cross-flow bridge copy unification (B3.12)
- 3 near-identical "Add elective procedure" rows with confusing copy ("creates a new diagnosis group" not communicated).
- Single shared component. Copy: "Also doing an elective procedure? Add a separate diagnosis group →"
- File: `DiagnosisGroupEditor.tsx`.

---

## Cluster 6 — Performance + theme system

These are infrastructural and don't change UX, but they reduce future maintenance friction.

### 6a. `theme.X + "NN"` sweep (P2.3 continuation)
- 30+ callsites still use the string-concat opacity pattern. Replace with the alpha-baked surface tokens (`theme.accentSurface`, `theme.warningSurface`, etc.) introduced in 2.7.0.
- Mechanical grep: `grep -rn 'theme\.\w\+ + "[0-9a-f]\{2\}"' client/` → rewrite each.
- Risk: low. Pattern still works, just makes future theme migration cleaner.

### 6b. `buildCurrentDiagnosisGroup` 21-deps perf
- `DiagnosisGroupEditor.tsx` `buildCurrentDiagnosisGroup` has 21 useCallback deps and fires `onChange` on every keystroke → cascades into `caseHasFlapProcedure`, `getModuleVisibility`, parent dispatches.
- Profile first (React DevTools Profiler in dev). If actual reflows are slow:
  - Memoize sub-objects (procedure list, fractures, lesions) separately.
  - Consider a useReducer inside DiagnosisGroupEditor so individual state slices don't all trigger the build.
  - Or: debounce `onChange` to the parent at 100ms.
- Risk: medium. Test thoroughly to avoid losing data on rapid edits.

### 6c. SlnbDisclosureGroup Reanimated migration
- `ProcedureClinicalDetails.tsx:1552–1617` uses JS-thread `Animated.spring` with `maxHeight: 2000` interpolation cap.
- Migrate to Reanimated's `useAnimatedStyle` + `withTiming`. Honour `useReduceMotion` like CollapsibleFormSection.

### 6d. Skin-cancer chip grid replacement (P2.8)
- `DiagnosisGroupEditor.tsx:3799–3853` hand-rolls a chip grid for skin-cancer procedures.
- Replace with `<ProcedureSuggestions>` (shared with all other specialties).
- Maintenance liability: every styling change to ProcedureSuggestions has to mirror in this inline grid.

### 6e. Drop dev-only scroll-jump instrumentation
- After ~1 week of TestFlight use, if no `[opus:scroll-jump]` warnings have surfaced, remove the `handleTouchStart` fiber walk + the jump-detection block in `handleScroll`.
- File: `CaseFormScreen.tsx`.
- If warnings DO surface: the `lastTouchedTestID` tells us exactly which interactive element causes drift. Wrap that callsite with `useScrollPreserve`.

---

## Cluster 7 — Cross-platform + locale

### 7a. Android date picker review
- iOS got the inline calendar in 2.7.0; Android stays on the native default dialog.
- Verify Android picker behaves well at SE-equivalent screen sizes.
- Decide: bring Android up to inline parity (with `display="default"` rendering a native dialog the user can't reposition) or leave as-is.

### 7b. Dynamic Type support
- The case form currently uses fixed font sizes. State-of-the-art on iOS supports Dynamic Type (`allowFontScaling`).
- For a precision clinical form where layout consistency matters most, this is a trade-off. If turning it on: cap at 130% scale, test all sections.
- Likely a separate session; needs design pass.

### 7c. RTL support
- Not currently supported. If targeting markets requiring it, plan a separate audit.
- Low priority unless App Store metadata indicates Hebrew/Arabic.

---

## How to start the next session

```
[user opens session]
[user types]: continue case form UX work; pick cluster X from the follow-up notes

[Claude]:
1. Read /Users/mateusz/projects-local/Opus_Logbook/.claude/plans/case-form-followup-notes.md
2. Read /Users/mateusz/projects-local/Opus_Logbook/.claude/plans/case-form-ux-audit.md for context
3. Pick the cluster, scope it as a focused plan, implement, verify, hand back
```

**Suggested first follow-up**: Cluster 1 (OperativeSection restructure) — biggest single visible improvement, well-scoped, one file, ~3 hours.

**Suggested second follow-up**: Cluster 4 (Field-level deep-link from summary) — high-leverage UX win that fixes a real friction point and uses infrastructure (FormScrollContext) we already built.

**Suggested third follow-up**: Cluster 3 (Accept-Mapping standardisation) — multi-file but mechanical, makes the form feel "designed" rather than "implemented" because the mental model becomes consistent.

After those three, the form is in genuine "state-of-the-art" territory for a clinical app.

---

## Build state at session close

- Branch: `main`
- HEAD: commit `2d9012a` — "2.7.0 — Case form UX overhaul + MFC flap + inline date picker"
- Pushed: yes (`d8ba939..2d9012a main -> main`)
- App version: 2.7.0 buildNumber 11 (EAS remote auto-increments at build time)
- EAS build: triggered with `--auto-submit` (auto-routes to TestFlight on success)
- TestFlight: pending. Build dashboard at https://expo.dev/accounts/gladmat/projects/surgical-logbook/builds
- 1529 / 1529 tests passing
- `tsc --noEmit` clean
- prettier clean on all touched files
- Pre-existing repo-wide prettier debt (145 errors across files I didn't touch) is unchanged — out of scope for this PR. Address via `npx prettier --write .` if you want a one-time cleanup commit.

## Known-good test plan for TestFlight build

Reference list — copy into TestFlight notes if needed:

1. **iPhone SE 3** form factor — confirm SectionNavBar's 6 pills render with short labels + completion underline
2. **Specialty switch** orphan-blob fix — burns → breast switch must NOT carry burns assessment
3. **Accept-Mapping guard** — skin cancer assessment without accept must fail save with inline error
4. **Delete confirmation** — populated diagnosis group delete shows Alert.alert
5. **Plan-mode banner** — amber banner appears above section nav when plan mode active
6. **Section scroll on collapse** — collapsing a section above viewport keeps visible content put
7. **Header Save hidden** — new case: only overflow icon. Edit case: header Save reappears
8. **Reduce Motion** — OS toggle → CollapsibleFormSection + DatePickerField snap instantly
9. **VoiceOver** — gender chips, team chips, section pills all announce role + state
10. **MFC flap** — hand surgery → scaphoid non-union → confirm MFC suggestion appears
11. **Inline date picker** — tap any date field → iOS-14+ calendar grid expands below the field (NOT bottom modal)
