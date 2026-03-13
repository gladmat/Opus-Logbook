# Opus Logbook - Architecture Audit and Breast Module Readiness Review

**Date:** 2026-03-13
**Scope:** Current repository state, with deepest review on the breast module and its integration into form state, exports, preferences, episodes, and surrounding architecture.
**Reference target:** `breast-module-blueprint.md` plus phases 1-5.

---

## Executive Summary

Opus has a strong foundation: strict TypeScript, fast tests, a clear offline-first posture, and thoughtful domain modeling across hand trauma, skin cancer, implants, media, and security. The breast work is not greenfield anymore; a meaningful amount of it is already in the repo. The problem is that the current implementation is only partially aligned with the blueprint and has a few contract-level mistakes that will make mixed-context breast cases unreliable if left as-is.

The main conclusion is:

- The repo is healthy enough to keep building on.
- The breast module is **not yet ready for full-scale implementation on top of the current contracts**.
- The next work should start with **correctness and contract repair**, not more feature surface.

### Baseline From Current Repo Evidence

- `npm run check:types` passes.
- `npm test` passes with **788 tests** across **45 test files**.
- `npm run lint` fails with **224 problems** (**214 errors, 10 warnings**), with a large concentration in the newer breast files plus nearby new helpers.
- Current file-size hotspots that will materially affect breast work:
  - `client/lib/procedurePicklist.ts` - 5863 lines
  - `client/components/DiagnosisGroupEditor.tsx` - 3387 lines
  - `client/hooks/useCaseForm.ts` - 1962 lines
  - `client/lib/storage.ts` - 1175 lines
  - `client/components/breast/ImplantDetailsCard.tsx` - 746 lines
  - `client/components/breast/BreastFlapCard.tsx` - 551 lines

### Overall Assessment

- Core repo health: **B**
- Breast module readiness against blueprint: **C**
- Main reason for the lower breast score: the current code has several places where the UI, state contract, and export/persistence model disagree with the blueprint's central architecture decisions.

---

## What Is Already Strong

- The codebase has a good domain vocabulary and generally favors typed, explicit data structures.
- The repo already contains breast-specific types, diagnosis picklists, procedure catalogue entries, UI cards, preferences, summary helpers, and export hooks.
- The project has unusually fast feedback loops for its size: passing typecheck and a 788-test suite make refactoring realistic.
- The offline storage and encryption posture remain a major architectural strength and are a good fit for surgical logbook workflows.

---

## Blueprint Gap Summary

### Phase-by-phase status

- **Phase 1 - Partially landed**
  - Breast types and `moduleVisibility` support exist.
  - `CLAUDE.md` includes the locked breast decisions.
  - The initial state invariant for `BreastAssessmentData` is not enforced.

- **Phase 2 - Partially landed**
  - Breast diagnoses, procedures, and inline orchestration exist.
  - The orchestrator is still group-level when the blueprint requires side-aware behavior.

- **Phase 3 - Partially landed**
  - Implant, flap, lipofilling, chest masculinisation, and helper components exist.
  - Pedicled flap and nipple workflows are declared in flags but not implemented end-to-end.

- **Phase 4 - Partially landed**
  - Gender-affirming fields and chest masculinisation UI exist.
  - Reconstruction episode UX is present as a component stub but is not wired.
  - Bilateral copy behavior exists but is not safe enough for mixed-context cases.

- **Phase 5 - Not landed end-to-end**
  - Local episode type supports `breastReconstructionMeta`.
  - There is no shared/server treatment episode schema or episode API surface.
  - CSV/FHIR/PDF support exists, but only partially covers the blueprint's intended export shape.

---

## Findings

## Critical Findings

### 1. Breast first-open flow can render with no editable side card

- **Severity:** Critical
- **File references:** `client/components/DiagnosisGroupEditor.tsx:2184-2192`, `client/components/breast/BreastAssessment.tsx:73-96`, `client/components/breast/BreastAssessment.tsx:144-202`
- **Problem:** The default value passed into `BreastAssessment` is `{ laterality: "left", sides: {} }`. Because the `Left` chip is already selected, pressing it again is a no-op, and no left-side card is initialized automatically.
- **Why it matters:** The first user interaction with a breast case can open into a state that looks selected but offers no editable form. That is a hard UX break and a trust-damaging correctness issue.
- **Recommended change:** Enforce a normalization invariant: if `laterality` includes a side, that side object must exist. Add a single `normalizeBreastAssessment()` or `createEmptyBreastAssessment()` helper and use it at creation, edit load, and render boundaries.
- **What this improves:** Fixes first-open usability, removes ambiguous empty states, and gives every downstream consumer a stable contract.
- **Priority bucket:** `must-fix before implementation`

### 2. Module ownership is group-level, but the blueprint requires per-side context

- **Severity:** Critical
- **File references:** `client/components/DiagnosisGroupEditor.tsx:914-921`, `client/components/breast/BreastAssessment.tsx:199-226`, `client/components/breast/BreastSideCard.tsx:287-325`, `client/lib/breastConfig.ts:56-92`
- **Problem:** `breastModuleFlags` are computed once for the whole diagnosis group from selected procedures plus the single selected diagnosis. Those same flags are then passed to every side card. The blueprint's central rule is the opposite: procedure activation is shared, but clinical context is soft and independent per side.
- **Why it matters:** A bilateral case with one reconstructive side and one aesthetic side cannot behave correctly if both sides share the same context-sensitive flags. This affects rendering, completion logic, and episode prompts.
- **Recommended change:** Split the flag model into:
  - shared procedure-driven flags at the assessment level
  - per-side context-driven visibility at the side-card level
  Compute side behavior from `side.clinicalContext`, not from `selectedDiagnosis`.
- **What this improves:** Makes mixed bilateral reconstruction + symmetrisation cases work as designed and removes the biggest architectural mismatch with the blueprint.
- **Priority bucket:** `must-fix before implementation`

### 3. Bilateral copy behavior is unsafe and can overwrite meaningful data

- **Severity:** Critical
- **File references:** `client/components/breast/BreastAssessment.tsx:120-132`, `client/components/breast/BreastAssessment.tsx:204-210`
- **Problem:** Copy-to-other-side uses `JSON.parse(JSON.stringify(source))` and decides whether the target side is "empty" largely by checking `!otherData || !otherData.reconstructionTiming`. That emptiness test is invalid for aesthetic and gender-affirming sides.
- **Why it matters:** A right side with real aesthetic data but no reconstruction timing can still look "copyable" and be overwritten. That is the exact type of bug the soft-context architecture was meant to avoid.
- **Recommended change:** Replace the heuristic with an explicit `isBreastSideEmpty()` predicate that checks all meaningful side data, and replace JSON string cloning with `structuredClone` for consistency with the rest of the repo.
- **What this improves:** Prevents silent data clobbering and makes bilateral workflows safe.
- **Priority bucket:** `must-fix before implementation`

## High Findings

### 4. The lipofilling contract is split incorrectly and can lose bilateral/shared data

- **Severity:** High
- **File references:** `client/types/breast.ts:389-417`, `client/components/breast/BreastSideCard.tsx:302-307`, `client/components/breast/LipofillingCard.tsx:146-174`, `client/lib/exportCsv.ts:217-280`
- **Problem:** `LipofillingData` mixes shared harvest/process/session fields with both `injectionLeft` and `injectionRight`, but the object is stored per side at `BreastSideAssessment.lipofilling`. On bilateral cases, shared metadata can diverge across left and right side objects, and CSV currently exports only the first non-empty lipofilling object it finds.
- **Why it matters:** Shared harvest facts should not live in two competing side objects. This is a contract bug, not just a UI quirk.
- **Recommended change:** Move lipofilling to a single assessment-level contract with shared data plus per-side injection children, or split it into `BreastLipofillingSharedData` and `BreastLipofillingSideData`.
- **What this improves:** Makes bilateral fat grafting deterministic, simplifies exports, and removes duplicated shared state.
- **Priority bucket:** `must-fix before implementation`

### 5. Reconstruction episode flow is a UI dead end and not backed by server/shared schema

- **Severity:** High
- **File references:** `client/components/breast/BreastAssessment.tsx:35-43`, `client/components/breast/BreastAssessment.tsx:222-224`, `client/components/breast/BreastSideCard.tsx:319-325`, `client/components/breast/ReconstructionEpisodeCard.tsx:1-87`, `client/lib/episodeStorage.ts:1-120`, `client/types/episode.ts:94-128`, `shared/schema.ts`, `server/routes.ts`
- **Problem:** The UI has a `ReconstructionEpisodeCard`, but `DiagnosisGroupEditor` does not provide episode callbacks or linked episode state, so the card is effectively unreachable. Separately, episodes are local-only in `client/lib/episodeStorage.ts`, while Phase 5 expects server/schema support. `shared/schema.ts` defines only 8 tables and has no `treatment_episodes` table; `server/routes.ts` has no episode API surface.
- **Why it matters:** The repo currently implies a staged reconstruction workflow without actually having an end-to-end persistence story.
- **Recommended change:** Decide the authoritative episode architecture now:
  - local-only for v1, documented clearly, or
  - server-backed, with shared schema, API DTOs, and sync path
  Then wire `DiagnosisGroupEditor` to real episode create/link/unlink flows.
- **What this improves:** Removes a dead-end UI path and prevents future client/server drift from hardening into production debt.
- **Priority bucket:** `must-fix before implementation`

### 6. Export support is partial and inconsistent across CSV, FHIR, and PDF

- **Severity:** High
- **File references:** `client/lib/exportCsv.ts:106-140`, `client/lib/exportCsv.ts:200-282`, `client/lib/exportFhir.ts:455-463`, `client/lib/exportFhir.ts:564-662`, `client/lib/exportFhir.ts:749-752`, `client/lib/exportPdfHtml.ts:80-100`
- **Problem:** Export coverage exists, but it is not contract-complete:
  - CSV currently exports only a 36-column breast subset and omits major Phase 5 fields such as device type, gender-affirming details, coupler values, episode stage, and richer lipofilling/session data.
  - CSV exports raw manufacturer ids rather than a normalized human-readable or coded representation.
  - FHIR adds only a laterality extension plus standalone breast `Device` resources; those devices are not linked to procedures through `focalDevice`, unlike the joint-implant path.
  - PDF includes implant/flap/chest-masc summaries only and omits lipofilling and episode context.
- **Why it matters:** Export parity is where architectural inconsistencies become visible to end users, audits, registries, and future integrations.
- **Recommended change:** Introduce one canonical breast export mapper that produces a single normalized DTO reused by CSV, FHIR, and PDF. Add explicit procedure-to-device linkage in FHIR and decide one manufacturer export standard.
- **What this improves:** Makes exports consistent, easier to test, and safer for real-world registry/reporting use.
- **Priority bucket:** `should-fix during implementation`

### 7. Pedicled flap and nipple workflows are declared in flags but not implemented

- **Severity:** High
- **File references:** `client/lib/breastConfig.ts:41-49`, `client/lib/breastConfig.ts:77-91`, `client/components/breast/BreastSideCard.tsx:287-325`, `client/types/breast.ts:57`, `client/types/breast.ts:604-612`
- **Problem:** `showPedicledFlapDetails` and `showNippleDetails` exist in the flag contract, but the breast UI renders no dedicated pedicled flap or nipple card. The types are present; the rendering path is not.
- **Why it matters:** This is dead-end architecture: the catalogue and flags advertise support that the UI cannot actually capture.
- **Recommended change:** Either implement the missing cards now or remove the flags until they are real. Because the blueprint requires these workflows, the right move is implementation, not hiding the flag.
- **What this improves:** Aligns state contracts, flags, and UI so the feature surface is honest and complete.
- **Priority bucket:** `must-fix before implementation`

## Medium Findings

### 8. Completion logic is not aligned with declared module surface

- **Severity:** Medium
- **File references:** `client/lib/breastConfig.ts:99-150`, `client/components/breast/BreastCompletionSummary.tsx:19-40`
- **Problem:** Completion only tracks laterality, context, implant, flap, lipofilling, and chest masculinisation. It ignores pedicled flap, nipple, and gender-affirming context requirements even though those concepts exist in the module contract.
- **Why it matters:** A completion badge that does not reflect the actual required surface becomes misleading and trains users not to trust it.
- **Recommended change:** Rebuild completion from the same normalized per-side visibility contract that drives rendering. Only score modules that are actually relevant for that side.
- **What this improves:** Makes the completion UI clinically meaningful and consistent with the blueprint.
- **Priority bucket:** `should-fix during implementation`

### 9. Preferences currently auto-enable ADM, which turns a preference into an operative fact

- **Severity:** Medium
- **File references:** `client/components/breast/ImplantDetailsCard.tsx:193-230`, `client/screens/SurgicalPreferencesScreen.tsx:280-307`
- **Problem:** If a preferred ADM product exists, the implant card auto-sets `admUsed = true` and pre-populates `admDetails.productName`. The blueprint called for auto-filling manufacturer, surface, and pocket rinse, not auto-recording ADM use.
- **Why it matters:** A saved preference should not silently assert that a biologic or mesh was used in the operation. That is a clinical fact and a documentation risk.
- **Recommended change:** Keep ADM preference as a suggestion only. Preselect the product only after the surgeon explicitly turns ADM on.
- **What this improves:** Preserves documentation integrity and avoids accidental false-positive implant/ADM records.
- **Priority bucket:** `must-fix before implementation`

### 10. The new breast code landed with a broken quality gate

- **Severity:** Medium
- **File references:** `client/components/breast/*`, `client/components/DraftNumericInput.tsx:1-105`, `client/screens/SurgicalPreferencesScreen.tsx:1-318`, `client/components/DiagnosisGroupEditor.tsx:116`, plus current lint output
- **Problem:** Typecheck and tests are green, but lint is red with 224 issues, many in the new breast files and nearby helpers.
- **Why it matters:** This is not mainly a style problem. It is a process signal that the breast branch was merged without the same hygiene bar as the rest of the repo. That makes it easier for real defects to hide in noise.
- **Recommended change:** Restore a hard local/CI gate for lint before more breast work lands. Run a format/cleanup pass before resuming feature expansion.
- **What this improves:** Keeps the next refactor readable, reduces review noise, and lowers the chance of missing substantive issues during implementation.
- **Priority bucket:** `should-fix during implementation`

### 11. Test coverage is strong at the pure-function layer but thin at the UI and orchestration layer

- **Severity:** Medium
- **File references:** `client/lib/__tests__/breastPhase3.test.ts`, `client/lib/__tests__/breastPhase4.test.ts`, `client/lib/__tests__/breastExport.test.ts`, `client/components/breast/*`, `client/components/DiagnosisGroupEditor.tsx`
- **Problem:** The current breast tests are mostly pure-function and export tests. There are no component-level tests for `BreastAssessment`, `BreastSideCard`, `ImplantDetailsCard`, `LipofillingCard`, or the diagnosis-editor integration.
- **Why it matters:** That is exactly why the first-open no-side bug can coexist with green tests.
- **Recommended change:** Add React Native component tests for:
  - first-open left-side initialization
  - bilateral mixed-context rendering
  - copy-to-other-side protection
  - ADM preference behavior
  - lipofilling bilateral/shared contract behavior
  - episode link/unlink UX
- **What this improves:** Moves the most failure-prone logic under executable regression coverage instead of relying on pure-function confidence only.
- **Priority bucket:** `must-fix before implementation`

### 12. `DiagnosisGroupEditor` and adjacent form orchestration are already too monolithic for another specialty branch

- **Severity:** Medium
- **File references:** `client/components/DiagnosisGroupEditor.tsx`, `client/hooks/useCaseForm.ts`, `client/lib/procedurePicklist.ts`, `client/lib/storage.ts`
- **Problem:** The breast module is being added into an already very large orchestration surface. `DiagnosisGroupEditor.tsx` owns multiple specialty activations, picker flows, visibility rules, and summaries. `useCaseForm.ts` and `storage.ts` also carry too many responsibilities.
- **Why it matters:** Even correct breast features will be expensive to maintain if every change touches these monoliths.
- **Recommended change:** Before broadening breast scope, extract:
  - a breast-specific controller hook from `DiagnosisGroupEditor`
  - a normalized breast state helper module
  - static procedure data away from procedure query logic
  - storage adapters away from migration/index logic where practical
- **What this improves:** Makes future specialty work cheaper, reduces accidental regressions, and shortens review cycles.
- **Priority bucket:** `follow-up refactor`

### 13. The repo has a real client/server boundary drift that the breast work exposes

- **Severity:** Medium
- **File references:** `client/lib/episodeStorage.ts:1-120`, `shared/schema.ts`, `server/routes.ts`, `client/lib/exportFhir.ts:164-189`
- **Problem:** The app currently behaves like two systems:
  - a rich local encrypted surgical logbook
  - a server-backed auth/profile/reference service
  The breast episode work now pushes against that boundary, because the client types and FHIR exporter know about `breastReconstructionMeta` but the shared/server model does not.
- **Why it matters:** This is manageable if explicit, but risky if left implicit. New features will keep guessing whether their source of truth is local, shared, or eventually synced.
- **Recommended change:** Write down the boundary explicitly in code and docs. For each new breast data object, declare whether it is:
  - local-only
  - export-only
  - shared/server-backed
- **What this improves:** Prevents partial server assumptions from leaking into client features and makes future sync work much less painful.
- **Priority bucket:** `should-fix during implementation`

---

## Proposed Contract Changes Before Further Breast Implementation

### 1. `BreastAssessmentData`

**Current issue:** active sides are optional even when `laterality` says they should exist.

**Recommended contract direction:**

- Guarantee active-side presence.
- Introduce a normalizer/helper as the single entry point for creation and repair.
- Prefer:
  - `laterality: "left" -> sides.left required`
  - `laterality: "right" -> sides.right required`
  - `laterality: "bilateral" -> both required`

**Benefit:** Removes an entire class of UI null states and simplifies downstream rendering.

### 2. `LipofillingData`

**Current issue:** shared harvest/process/session fields are living inside side-specific storage.

**Recommended contract direction:**

- Move lipofilling to assessment level, or
- split into shared data plus side injection payloads.

**Benefit:** Fixes bilateral consistency, simplifies export mapping, and matches the blueprint's workflow better.

### 3. `BreastModuleFlags`

**Current issue:** flags currently mix shared procedure-driven and side-context-driven concerns.

**Recommended contract direction:**

- Shared flags: implant, free flap, pedicled flap, lipofilling, chest masc, nipple.
- Per-side context flags: reconstructive context details, gender-affirming context, episode prompts, completion requirements.

**Benefit:** Makes mixed bilateral cases possible without branching hacks.

### 4. `TreatmentEpisode` and episode persistence

**Current issue:** the client has an episode model and local storage, but the shared/server side does not.

**Recommended contract direction:**

- Pick one:
  - local-first and explicitly local-only for now, or
  - shared/server-backed with schema, routes, DTOs, and migration plan

**Benefit:** Avoids dead-end UI and future sync confusion.

### 5. Breast export semantics

**Current issue:** CSV/FHIR/PDF each project a different subset of the breast model.

**Recommended contract direction:**

- Introduce one normalized breast export DTO.
- Map it once from domain state.
- Reuse it in CSV, FHIR, and PDF exporters.

**Benefit:** Prevents parity drift and makes export tests much cheaper to write.

---

## Dead Ends and Unused Surface

- `showPedicledFlapDetails` and `showNippleDetails` are real contract flags with no UI consumer.
- `showGenderAffirmingContext` exists in the flag object but side rendering already keys directly off `value.clinicalContext`, so the flag is currently redundant.
- `ReconstructionEpisodeCard` is implemented but not wired from the diagnosis editor.
- The old `AUDIT_REPORT.md` was stale and is now superseded by this document.

---

## Whole-Repo Architecture Health

### Strong areas

- Type safety remains strong.
- The offline encrypted architecture is coherent.
- Test runtime is fast enough to support iterative refactors.
- Specialty-specific domain modules are generally a good pattern.

### Areas that need structural attention

- The main form orchestration path is too centralized.
- Static catalogue data and procedural logic are still too intertwined in some large files.
- Local-only clinical data and server-backed identity/profile concerns need clearer architectural boundaries.
- New specialty work should not keep landing into a red lint state.

---

## Fixed-Order Implementation Roadmap

## P0 Correctness

1. Normalize `BreastAssessmentData` so first-open state always has an active side object.
2. Split shared vs per-side breast visibility logic and stop deriving side behavior from `selectedDiagnosis`.
3. Replace the copy-to-other-side emptiness heuristic and protect against overwriting meaningful target-side data.
4. Repair the lipofilling contract before adding more bilateral fat-grafting behavior.
5. Remove ADM auto-enable behavior from preferences.
6. Add UI-level regression tests for the first-open, bilateral mixed-context, copy safety, and ADM preference flows.

## P1 Data and Contract Parity

1. Decide the authoritative episode architecture and implement it end-to-end.
2. Implement the missing pedicled flap and nipple workflows.
3. Build one normalized breast export mapper and reuse it across CSV, FHIR, and PDF.
4. Extend export coverage to match the blueprint's intended breast data surface.
5. Add episode/linkage export semantics only after the domain contract is settled.

## P2 Performance and Elegance

1. Extract a breast controller from `DiagnosisGroupEditor`.
2. Split static catalogue data from query/search logic in `procedurePicklist.ts`.
3. Reduce responsibilities in `useCaseForm.ts` and `storage.ts`.
4. Restore lint-clean status and CI enforcement before the next major breast increment.
5. Replace incidental cloning and ad hoc normalization with explicit shared helpers.

---

## Required Regression Coverage Before More Breast Features Land

- First-open breast case flow creates a usable left-side card immediately.
- Switching laterality preserves and prunes side data correctly.
- Bilateral mixed-context case:
  - left reconstructive
  - right aesthetic
  - different modules show per side
- Copy-to-other-side refuses to overwrite meaningful target-side data without explicit intent.
- Lipofilling preserves shared harvest/process data and side-specific injections in bilateral cases.
- Preferences do not silently record ADM use.
- CSV, FHIR, and PDF export the same breast facts consistently.
- Episode linking persists correctly for the chosen architecture:
  - local-only, or
  - server-backed round-trip

---

## Final Recommendation

Do **not** continue by adding more breast feature surface on top of the current contracts. The right next move is a short repair phase focused on:

1. state invariants
2. side-aware module ownership
3. lipofilling and episode contracts
4. export normalization
5. missing workflow wiring

Once those are stable, the rest of the blueprint can be implemented on a much cleaner and faster path.
