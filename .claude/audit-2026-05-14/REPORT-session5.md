# Opus visual + functional audit — 2026-05-15 (Session 5)

**Continuation of** `REPORT-session4.md` / `REPORT-session3.md` /
`REPORT-session2.md` / `REPORT.md` / `NEXT-SESSION-PROMPT.md`.
**App version under test:** 2.7.0 + Phase 7.1 follow-ups + sessions 2–4
commits + this session's commits.
**Build flavour:** Source-level only this session — no sim driving.
**Tooling:** `npm run lint`, `npm run check:types`, `npx vitest run`.

---

## TL;DR

Session 5 was the **deeper-quality pass** the brief described — perf,
lint, and the one known server-side clinical bug. Worked the priority
list top-down through Clusters 1–6, leaving 7/8 (Maestro flows + sim
captures) deferred.

- 🟢 **Cluster 1 — BCRL lymphoedema staging fix** (server-side). Two
  clinical mis-routings in `getStagingForDiagnosis`: BCRL upper-limb
  (SNOMED `449620005`) was hitting the TNM-Breast keyword fallback
  because its display name contains "breast cancer"; post-melanoma
  lymphoedema (upper + lower) was hitting the TNM-Breslow fallback
  because the name contains "melanoma". Root fix: every lymphoedema
  diagnosis now resolves via SNOMED exact match — added 9 missing
  codes to the ISL config's `snomedCtCodes` so the keyword fallback
  never fires for this family. 7 new tests guard against regressions.
- 🟢 **Cluster 5 — Vestigial PlanCase cleanup.** Option B from the
  brief: deleted `getPlannedCases` / `getPlannedCaseCount` from
  `dashboardSelectors.ts` + their 5-test cluster from `plannedCase.test.ts`.
  Kept `filterOutPlannedCases` / `isPlannedCase` / `plannedTemplateId`
  /`plannedNote` since they have live callers (DashboardScreen,
  useStatistics, CaseFormScreen).
- 🟢 **Cluster 2 — React.memo perf audit.** Wrapped 3 of 6 audited
  pickers (`DiagnosisPicker`, `HandElectivePicker`,
  `ProcedureSubcategoryPicker`). Skipped `FreeFlapPicker` (call-site
  handlers in ProcedureClinicalDetails are not useCallback-wrapped;
  memo would be cargo cult) and the two assessment components
  (`SkinCancerAssessment`, `HandTraumaAssessment` — DiagnosisGroupEditor
  passes inline object props on every render). Also stabilised
  `DiagnosisGroupEditor.updateProcedure` (the perf bug the brief
  flagged) + `LVAOperativeDetails.anastomoses` (3-warning cluster from
  the same lint scan).
- 🟢 **Cluster 3 — react-hooks/exhaustive-deps cleanup.** 19 → 0
  warnings. The dense cluster was HandTraumaAssessment with 9 "complex
  expression in the dependency array" warnings — all were redundant
  array-index lookups already covered by the parent
  `value.digitAmputations` reference. The rest were missing-dep adds.
- 🟢 **Cluster 6 — Lint cleanup.** 18 → 0 import-duplicates (auto-fix
  pass safe to ship). 29 → 0 `Array<T>` → `T[]` array-type warnings
  (auto-fix). 8 → 0 `no-explicit-any` warnings (auto-fix side effect
  of the array-type pass). 83 → 1 `no-unused-vars` warnings: the lone
  remaining one is `handleMultiDigitConfirm` in `DiagnosisGroupEditor`
  — a 50-line useCallback that looks like a half-shipped feature
  ("Multi-digit confirm: create per-digit procedures from resolution
  map"). Left for the dev to either wire up or delete intentionally.
- 🟢 **Cluster 4 — Raw-hex round 2.** Added 3 new theme token sets
  (`theme.pathology.*`, `theme.burnDepth.*`, `theme.nerveSeverity.rupture`)
  and migrated 5 call sites that were holding the semantic clinical
  colours as raw hex. Raw-hex literals in `client/` went 156 → 132.

**Commits this session: 7.** Tests stayed at 1540/1541 throughout (BCRL
fix added 7, vestigial cleanup removed 5, net +2). `tsc --noEmit` clean
throughout.

---

## Commits landed this session

| Commit  | Summary |
|---------|---------|
| [`5706471`](https://github.com/dummy/sha/5706471) | Force SNOMED exact match for all lymphoedema diagnoses (BCRL ISL fix) |
| [`513bc18`](https://github.com/dummy/sha/513bc18) | Delete vestigial getPlannedCases / getPlannedCaseCount helpers |
| [`d5e2796`](https://github.com/dummy/sha/d5e2796) | Memoize dense pickers + stabilise updateProcedure / LVA anastomoses |
| [`a87f7e4`](https://github.com/dummy/sha/a87f7e4) | Clear all 17 react-hooks/exhaustive-deps warnings |
| [`bced1b3`](https://github.com/dummy/sha/bced1b3) | Lint cleanup: array-type / import deduplication / import-type repair |
| [`5476b98`](https://github.com/dummy/sha/5476b98) | Sweep 82 unused-vars warnings — delete dead imports + intermediates |
| [`0dc0bf5`](https://github.com/dummy/sha/0dc0bf5) | Raw-hex round 2: add theme.pathology / .burnDepth / .nerveSeverity tokens |

---

## Cluster 1 — BCRL staging fix (commit `5706471`)

### Root cause

`server/diagnosisStagingConfig.ts:getStagingForDiagnosis()` does an
exact SNOMED match first, then falls back to keyword `.find()` on the
diagnosis display name. For lymphoedema diagnoses this fallback is
fundamentally unsafe because the entries embed their aetiology in the
display name:

- "Breast cancer-related lymphoedema — upper limb" — contains "breast
  cancer" → matches the TNM-Breast config keyword
- "Post-melanoma lymphoedema — upper limb" — contains "melanoma" →
  matches the Melanoma/Breslow config keyword

Both TNM configs appear earlier in the array than the ISL config,
so `.find()` returns the wrong staging block. Surgeons saw "TNM T
Stage / TNM N Stage" instead of "ISL Stage / Cheng Grade / MD
Anderson ICG Stage".

Verified each failing case by tracing the lookup:
- BCRL upper (`449620005`) → exact-match miss → keyword fallback → TNM-Breast wins (bug)
- BCRL breast (`234097001`) → exact-match HIT against ISL config → correct (so this one was actually fine)
- Post-melanoma upper (`449620005`) → exact-match miss → keyword fallback → TNM-Breslow wins (bug)
- Post-melanoma lower (`403385000`) → exact-match miss → keyword fallback → TNM-Breslow wins (bug)

### Fix

Added every SNOMED code used by `client/lib/diagnosisPicklists/lymphoedemaDiagnoses.ts`
that wasn't already in the ISL config's `snomedCtCodes`. After the
fix, every lymphoedema entry resolves via exact match and the keyword
fallback is never reached.

Reorganized the snomedCtCodes array into a "client-active" section + a
"defensive (legacy)" section with a long comment explaining the
fragile-keyword-fallback rationale.

### Tests added

7 new tests in `server/__tests__/diagnosisStagingConfig.test.ts`:

- BCRL upper → ISL (regression guard for primary bug)
- BCRL breast → ISL (regression guard — was already working but locks
  it in)
- Post-melanoma upper / lower → ISL (regression guards for secondary bug)
- All 6 non-BCRL post-cancer entries → ISL via SNOMED (gynaecological,
  urological, melanoma, sarcoma, radiation, genital, H&N)
- All 5 primary entries → ISL via SNOMED (Milroy, Meige, tarda,
  hereditary, primary)

Total server staging tests: 3 → 10.

### Verification deferred

The user-facing verification (on-device or via the staging API
endpoint) needs the dev server running. Code-level verification only
this session (all 10 staging tests pass). Recommend a manual on-device
spot-check on the next sim session.

---

## Cluster 5 — Vestigial PlanCase cleanup (commit `513bc18`)

The brief offered Option A (re-wire into a "Planned Cases" filter chip)
vs Option B (delete). Went with Option B because adding a 13th specialty
filter chip would crowd iPhone SE 3 width (the 12 specialty chips
already fill the bar), and a separate planned-cases zone is real
product design work that needs Mateusz's eye.

Deleted:
- `getPlannedCases` helper in `dashboardSelectors.ts` (no production callers)
- `getPlannedCaseCount` helper in `dashboardSelectors.ts` (no production callers)
- 3-test `getPlannedCases` describe block + 2-test `getPlannedCaseCount`
  describe block in `plannedCase.test.ts`

Retained (live callers verified):
- `filterOutPlannedCases` — used by `DashboardScreen`, `useStatistics`
- `isPlannedCase` / `isPlannedCaseSummary` — used internally + by `CaseFormScreen`
- `plannedTemplateId` / `plannedNote` / `plannedDate` fields — 1-line
  optional fields. The in-form plan-mode toggle still writes `caseStatus:
  "planned"` to the case, and these fields might still exist on cases
  written by older builds that ran PlanCaseScreen. Removing them risks
  silently losing data on summary rebuild.

The retained `plannedCase.test.ts` still tests 4 describe blocks (13
tests): resolvedCaseStatus, isPlannedCase, filterOutPlannedCases, and
template-metadata carry-through. Still meaningful coverage.

---

## Cluster 2 — React.memo perf audit (commit `d5e2796`)

Audited all 6 components the brief flagged. Found 3 that are clean wins,
1 cargo-cult risk, and 2 that need deeper refactoring first.

### Wrapped

| Component | Callsite stability check |
|-----------|--------------------------|
| `DiagnosisPicker` | 2 callsites (DiagnosisGroupEditor + AcuteHandAssessment). Both pass `handleDiagnosisSelect` / `handleSnomedFallbackSelect` via `useCallback`. Strings + 1 callback prop — pure shallow-compare win. |
| `HandElectivePicker` | 1 callsite (HandElectiveAssessment). `handleDiagnosisSelect` is `useCallback`-wrapped. Pure win. |
| `ProcedureSubcategoryPicker` | 3 callsites. Aesthetics path uses `useCallback`; ProcedureEntryCard + BreastProgressiveAssessment pass inline arrows. Net positive for the aesthetics path, no-op for the others — but it's not WORSE. |

### Reverted

| Component | Why |
|-----------|-----|
| `FreeFlapPicker` | Sole callsite (ProcedureClinicalDetails) uses plain-function handlers that close over `clinicalDetails` + `onUpdate`. Both upstream chains are unstable. Memo without call-site stability is cargo cult per the brief. Reverted the wrap. |

### Skipped (object props built inline)

| Component | Why |
|-----------|-----|
| `SkinCancerAssessment` | DiagnosisGroupEditor passes `assessment={...}`, `procedurePicklistIds={...}` from object/array refs built mid-render. Stabilising them is a separate refactor. |
| `HandTraumaAssessment` | Same — `value={diagnosisClinicalDetails.handTrauma \|\| {}}` creates a new `{}` every render when handTrauma is undefined; inline arrow `onChange`, `onIncidentChange`, `onProceduresChange`, `onEditDiagnosis` callbacks. |

### Additional perf fixes from the brief

- **`DiagnosisGroupEditor.updateProcedure`** was a plain function recreated
  every render, which was breaking the useCallback at line 2342 that
  depended on it. Wrapped in useCallback with empty deps (uses only the
  stable `setProcedures` setter + the module-level `procedureHasImplant`
  helper).
- **`LVAOperativeDetails.anastomoses`** was `value.anastomoses ?? []`
  creating a new `[]` every render, breaking 3 downstream useCallback
  hooks (`addAnastomosis` / `updateAnastomosis` / `removeAnastomosis`).
  Wrapped in `useMemo([value.anastomoses])`.

---

## Cluster 3 — react-hooks/exhaustive-deps cleanup (commit `a87f7e4`)

19 warnings (after Cluster 2 closed 2 of them) → 0. Three patterns:

### Pattern 1: real missing dep — add to deps array

- `DiagnosisGroupEditor.tsx:2291` and `:2355` — `updateProcedure` is
  now a stable useCallback so adding it to deps is documentation
  rather than behaviour change.
- `BreastProgressiveAssessment.tsx:987` — sections-building useMemo
  reads `suppressFreeFlap` but didn't list it.
- `CaseFormScreen.tsx:544` — `scrollToSection` is used inside
  `handleProceedToReview`'s useCallback.
- `NeedsAttentionListScreen.tsx:483` — `navigation` is used inside the
  FlatList's renderItem useCallback.

### Pattern 2: complex expression in dep array — wrap parent in useMemo

- `LVAOperativeDetails.tsx:536` — handled in Cluster 2.
- `ElectrodiagnosticSummary.tsx:58` — `edx = data ?? {}` wrapped in
  `useMemo([data])`.

### Pattern 3: complex expression that's redundant with parent ref

The dense `HandTraumaAssessment` cluster — 9 warnings, all
`value.digitAmputations?.[0]?.level/.type/.isReplantable` style array-
index lookups. Each is covered by the parent `value.digitAmputations`
reference (when the array changes, the array reference changes, so all
index lookups are implied). Removed the redundant deps from 3
useMemo hooks (amputationState, diagnosisGroupSignature,
hasTraumaSelection, selectionSignature). Also removed an unnecessary
`selectedDigits` dep from amputationState — that useMemo body doesn't
read it.

---

## Cluster 6 — Lint cleanup (commits `bced1b3` + `5476b98`)

### Part A — Auto-fixable warnings (commit `bced1b3`)

`npm run lint:fix` cleared:

- **18 → 0 `import/no-duplicates`** — most were trivial split-pair
  vitest imports merged. The two stubborn ones in
  `caseFormProcedureRemap.test.ts` needed a manual merge.
- **29 → 0 `Array<T>` shorthand** — pure stylistic, conformance with
  the eslint config's `@typescript-eslint/array-type` shorthand
  preference.
- **8 → 0 `no-explicit-any`** — side effect of the array-type pass
  (autofixer dropped some orphaned `eslint-disable-next-line` comments
  that became unnecessary).

One manual fix needed: the pre-commit auto-fixer had blanket-wrapped
`TEAM_MEMBER_ROLE_SHORT` (a runtime const) under `import type` in
`TeamContactsScreen.tsx`. Same fix-pattern as the
SharedCaseDetailScreen repair from commit `3e38528` last session —
split into a value import with inline `type` modifiers.

### Part B — Unused vars (commit `5476b98`)

82 of 83 cleared by reading each in context.

Most were unused imports left over from refactors — components no
longer rendered, types narrowed, constants moved. A few were unused
intermediate vars (`acgmeSubcategory`, `interventionType`,
`inferredDiagnosisId` in `AestheticProcedureFirstFlow` — three
back-to-back useMemo blocks declared but never read; `isIma`, `isUlna`,
`first` locals; `intact` arrow function in `peripheralNerveConfig` —
sibling of `injured` that's no longer called).

One deletion of dead code: `saveCaseIndex` in `storage.ts` was a
defined-but-never-called function from an earlier cache-write path.

Skipped: `DiagnosisGroupEditor.handleMultiDigitConfirm` — a 50-line
useCallback that builds per-digit procedures from a resolution map.
It's defined and committed but never wired up. Could be a half-shipped
feature (the comment says "Multi-digit confirm: create per-digit
procedures from resolution map"). Leaving for the dev to wire up
intentionally or delete with full context.

**Why this matters beyond "lint clean":** the unused-vars warnings
were hiding genuine perf issues like the unused `inferredDiagnosisId`
useMemo in AestheticProcedureFirstFlow — 3 useMemo blocks that
computed nothing, each adding a dep-array recomputation per render.

---

## Cluster 4 — Raw-hex round 2 (commit `0dc0bf5`)

The brief flagged ~126 raw-hex instances in 29 files as "potentially
objectively wrong" per CLAUDE.md's "always theme.* or palette.*" rule.
Round 1 (commit `45fa5ac` session 4) handled the `#fff` / brand-hex
pile. Round 2 attacks the **semantic clinical colours** that ARE
adapting to theme but were hard-coded inline.

### New theme tokens

Added to `client/constants/theme.ts` for both light and dark variants:

```typescript
pathology: {
  bcc: "#2563EB",          // blue
  scc: "#B47E00" / "#E5A00D",  // amber (light / dark)
  melanoma: "#7C3AED",     // purple
  benign: "#059669",       // green
  other: "#6B7280",        // grey
},
burnDepth: {
  superficial: "#FFB3BA",   // sunburn pink
  deepPartial: "#FF6B6B",   // red
  fullThickness: "#CC0000", // deep red
  mixed: "#FF8844",         // orange
},
nerveSeverity: {
  rupture: "#C4632B" / "#E5883E",  // brighter in dark mode
},
```

### Migrations

| File | Hex removed | Notes |
|------|-------------|-------|
| `MultiLesionEditor` | 4 (PATHOLOGY_OPTIONS) | Restructured options to carry `colorKey` not literal `color`; render-time lookup via `theme.pathology[opt.colorKey]`. SCC switches between modes for accent alignment. |
| `burns/TBSABodyOutline` | 7 (1 helper + 4 case branches + 3 legend dots) | Renamed helper to `getDepthColorKey`; render-time `theme.burnDepth[key]`. |
| `peripheral-nerve/BrachialPlexusDiagram` | 12 (4 fill branches + 4 text-color branches + 4 line strokes) | `getInjuryFill` / `getInjuryTextColor` switched from `isDark` param to `theme` param. The "in-between" rupture colour gets its own `theme.nerveSeverity.rupture` token; the other 4 grades map to existing `theme.success` / `.warning` / `.error` / `.backgroundTertiary`. Chrome connection-line strokes (`#4D555E` / `#B0B8C1`) switched to `palette.charcoal[750]` / `palette.charcoal[300]` — pure chrome, not clinical signal. |
| `peripheral-nerve/NeuromaAssessment` line 865 | 1 | `"#E5A00D40"` → `palette.amber[600] + "40"`. StyleSheet-scope, so palette literal is correct here (no theme access). |
| `OpusCameraScreen` line 877 | 1 | `"#2EA043"` (captured-step dot) inlined as `theme.success` in the JSX. Camera viewfinder `"#000"` background kept as-is — always-black surface. |

**Hex count in client/ (excluding tests + theme.ts):** 156 → 132 (-24).
Most of the remaining 132 are deliberate (camera viewfinder overlays,
charcoal-scale `palette` literals already migrated, design-system
constants inside StyleSheet that should stay palette references).

---

## Findings — triaged

### 🟢 Cleared this session

- **BCRL TNM-vs-ISL staging** (was carried forward from session 3).
- **Post-melanoma TNM-vs-ISL staging** (newly identified as part of the
  BCRL fix scope).
- **HeadNeck React.memo deferred verification** — now joined by
  DiagnosisPicker, HandElectivePicker, ProcedureSubcategoryPicker memos
  + the LVA / DiagnosisGroupEditor callback stabilisations. Same
  deferred-on-device-verification caveat as session 4 — the perf is
  mechanical (re-renders on no-op prop changes stop happening) but
  on-device kAXError-stress testing wasn't run this session.
- **Vestigial PlanCase selectors** — deleted.
- **19 react-hooks/exhaustive-deps warnings** — all closed.
- **18 import/no-duplicates** — all closed.
- **29 array-type warnings** — all closed.
- **8 no-explicit-any** — all closed.
- **82 of 83 unused-vars** — closed.
- **156 → 132 raw-hex instances** in `client/` (24 migrated).

### 🟡 Skipped or deferred

- **`DiagnosisGroupEditor.handleMultiDigitConfirm`** — defined, never
  called. Looks like half-shipped multi-digit-amputation per-digit
  procedure generator. Needs Mateusz's call.
- **Aesthetics 3-useMemo block (`acgmeSubcategory`, `interventionType`,
  `inferredDiagnosisId`)** — deleted as unused, but if these were
  *meant* to be displayed somewhere (e.g. ACGME coding badge), the
  feature is now removed. Recommend a quick visual check on the
  aesthetics procedure-first flow to confirm nothing visually
  disappeared.
- **The 132 remaining raw-hex instances** — most are intentional
  (camera viewfinder overlays, charcoal palette references, custom
  scrollbar tracks). A few might still warrant migration to existing
  tokens — flagged for a future "design pass" session rather than
  another mechanical sweep.
- **Cluster 7 (Maestro flow extensions)** and **Cluster 8 (deep
  specialty captures)** — not started. Both are nice-to-have per the
  brief.

### 🔴 Carried forward

- **Onboarding has no PIN-skip** (session 3 + 4). Product call needed.
- **Inconsistent / Unpolished design-pass items** (nav-pill ellipsis,
  chip-text truncation in dense grids, AddCase specialty-card vertical
  distribution, episode cards showing raw patient identifier where
  case cards show names, EpisodeDetail "Change Status" amber fill
  reading as a selection). All carried forward from sessions 2–3.

---

## Coverage & gaps

### Covered

- ✅ **Cluster 1 — Server BCRL fix.** Full root cause + fix + 7 regression tests.
- ✅ **Cluster 5 — Vestigial PlanCase cleanup.** Option B chosen.
- ✅ **Cluster 2 — React.memo perf audit.** 3 wrapped + 2 perf-fix
  callbacks. Audited but skipped the 2 entangled assessment
  components.
- ✅ **Cluster 3 — react-hooks/exhaustive-deps cleanup.** 19 → 0.
- ✅ **Cluster 6 — Other lint cleanup.** 18 import-duplicates + 29
  array-types + 82 unused-vars all cleared.
- ✅ **Cluster 4 — Raw-hex round 2.** 5 of the highest-value files
  migrated with 3 new theme token sets defined.

### Gaps — recommended for session 6

- **Cluster 7 — Maestro flow extensions.** 3 new flows proposed in the
  brief: case-form-skin-cancer, onboarding-replay, attention-card-actions.
  All 3 would exercise testIDs added in sessions 2–4 and not currently
  covered.
- **Cluster 8 — Deep specialty captures.** Aesthetics
  ImplantDetailsCard, ProcedureTeamFooter on 2+ procedure cases, joint
  implant arthroplasty, burns acute with TBSA regional breakdown +
  body outline, free flap details with anastomosis entry card. These
  are all rendering code paths from sessions 2–4 that weren't visually
  verified yet.
- **On-device verification of session 5 fixes** — BCRL staging, perf
  memos. Run `.maestro/case-form-happy.yaml` 5× in a row to confirm
  the kAXError flakiness that motivated the H&N memo (session 4) is
  also better after this session's expanded memo coverage.

### Off-limits next session

- The `handleMultiDigitConfirm` mystery — needs product-side decision
  from Mateusz, not from another audit session.
- Subjective design polish — explicitly out of scope per the brief.
- `server/` is back to off-limits unless another clinical bug surfaces.
