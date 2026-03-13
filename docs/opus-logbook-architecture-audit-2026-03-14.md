# Opus Logbook Architecture Audit

Date: 2026-03-14
Mode: Audit only, report before implementation
Scope: Full code and data architecture review with special attention to Head & Neck
Constraint applied: migration/backfill strategy intentionally ignored because the app is still early and real data migration is not required

## Executive Summary

Opus Logbook is already a serious product. The app has strong domain depth, broad test coverage, a local-first case model, encrypted media handling, and meaningful specialty workflows. The Head & Neck module is no longer "missing"; it is partially and substantially implemented.

It is not yet at the "blazing fast, elegant, architecturally quiet" stage.

The biggest current risks are not missing features. They are:

- the core case model is too wide and too weakly typed in the hottest paths
- the case form still broadcasts a giant mutable state object across many heavy consumers
- some UI flows still hydrate full case payloads where summaries or indexes should be used
- Head & Neck support exists, but the implementation only partially matches the clinical blueprint
- several dead abstractions, placeholder files, duplicate configs, and unused layers are increasing maintenance cost

The most important strategic conclusion is this:

- because the app is early-stage, the right move is simplification, not compatibility
- delete stale layers now instead of carrying legacy shims into the next phase

## Baseline

Baseline checks run during this audit:

- `npm run check:types`: passed
- `npm test`: passed, 48 test files and 751 tests
- `npm run lint`: failed, 72 errors and 1 warning

Current workspace reality:

- the git worktree is dirty before this audit
- most lint failures are Prettier-format drift in current in-flight files, including Head & Neck additions and unrelated breast work
- this means runtime confidence is better than branch hygiene confidence

## What Is Strong

- The app is genuinely local-first for cases, episodes, and media, which is the right foundation for privacy-sensitive surgical logging.
- `client/lib/storage.ts` now has a real summary layer, cached indexes, and searchable summaries instead of forcing the dashboard and search onto full case hydration for every screen.
- The server bootstrap is clean and unified through `server/app.ts` and `server/index.ts`; there is no longer a split test-vs-production boot path problem.
- The Head & Neck module has meaningful substance already: 88 structured diagnoses, recipient vessel presets, MFC and omentum free flaps, irradiated neck assessment fields, and a joint-case UI.
- The project has a strong regression safety net. A 751-test suite in a mobile app of this size is a real asset.

## Severity-Ranked Findings

## P1. The canonical case model is too broad and too weakly typed

Evidence:

- `client/types/case.ts` is a 2,500+ line mixed domain file containing core entities, specialty-specific details, label maps, runtime helpers, and deprecated fields
- `client/hooks/useCaseForm.ts` keeps specialty data in `clinicalDetails: Record<string, any>` and uses a generic `SET_FIELD` action with `value: any`
- `client/components/FlapSpecificFields.tsx` reads and writes flap details through `(details as any)[key]`
- `client/screens/CaseDetailScreen.tsx` still renders multiple specialty fields through `as any` casts

Concrete references:

- `client/hooks/useCaseForm.ts:257`
- `client/hooks/useCaseForm.ts:283`
- `client/components/FlapSpecificFields.tsx:32`
- `client/screens/CaseDetailScreen.tsx:976`
- `client/types/case.ts:594`
- `client/types/case.ts:1108`
- `client/types/case.ts:1423`

Why this matters:

- the compiler cannot protect the hottest specialty code paths
- every new specialty feature increases the chance of runtime-only bugs
- read surfaces and write surfaces drift because there is no strongly enforced contract between them
- the domain model is becoming harder to understand than the product itself

Recommendation:

- split the canonical case model into domain modules: core case, patient identity, media, episodes, free flap, Head & Neck, skin cancer, hand trauma, breast, implants
- replace `clinicalDetails: Record<string, any>` with a discriminated union or explicit per-procedure/per-module typed envelopes
- separate persisted storage DTOs from form editing state
- because migration is not needed, remove deprecated compatibility fields now instead of preserving them

What this improves:

- stronger compile-time guarantees
- smaller change surfaces when adding new specialties
- easier exports, analytics, and detail rendering
- less need for `as any` casts and fallback logic

## P1. The case form still fans out a single giant state object across heavy consumers

Evidence:

- `CaseFormProvider` memoizes and publishes the entire `form.state`
- many large components subscribe to `useCaseFormState()`, including `DiagnosisGroupEditor`, `OperativeSection`, `OutcomesSection`, `PatientInfoSection`, `CaseSummaryView`, and `ProcedureEntryCard`
- any field change invalidates the shared state value and pushes rerenders through the form tree even when only one section changed

Concrete references:

- `client/contexts/CaseFormContext.tsx:77`
- `client/components/DiagnosisGroupEditor.tsx:215`
- `client/components/case-form/OperativeSection.tsx:104`
- `client/components/case-form/OutcomesSection.tsx:43`
- `client/components/case-form/PatientInfoSection.tsx:32`
- `client/components/ProcedureEntryCard.tsx:90`

Why this matters:

- typing in one area can rerender unrelated expensive trees
- `React.memo` helps less than it appears because the shared context value changes on every state mutation
- this will get worse as Head & Neck, breast, skin cancer, trauma, and implant workflows grow

Recommendation:

- move the form to selector-based subscriptions rather than full-state context reads
- practical options: Zustand with selectors, `use-context-selector`, or section-scoped reducers with a thin orchestration layer
- keep cross-section derived values centralized, but localize mutable editing state to the owning section

What this improves:

- smoother typing and picker interaction
- lower rerender pressure in the biggest screens
- clearer ownership boundaries between sections

## P1. Some high-traffic UI flows still hydrate full case payloads when summaries or indexes should be used

Evidence:

- the Inbox case picker calls `getCases()` and loads full `Case[]` into modal state
- statistics first load summaries, then hydrate every non-planned case with `getCasesByIds()`
- active episodes load visible episodes and then fetch linked cases per episode, producing an N+1 hydration pattern
- storage is still AsyncStorage-based for cases and episodes, which is workable now but not the end-state for truly fast indexed querying

Concrete references:

- `client/screens/InboxScreen.tsx:867`
- `client/hooks/useStatistics.ts:64`
- `client/hooks/useStatistics.ts:74`
- `client/hooks/useActiveEpisodes.ts:19`
- `client/lib/storage.ts:593`
- `client/lib/episodeStorage.ts:109`

Why this matters:

- modal open time and statistics load time will degrade with dataset growth
- decrypting and hydrating full cases is expensive when the UI only needs search metadata
- these paths burn battery and responsiveness on mobile hardware

Recommendation:

- short-term: change case picker flows to use `CaseSummary` instead of `Case`
- short-term: maintain an episode-to-case summary index so dashboards do not need repeated case hydration
- medium-term: move case headers, search text, episode links, and analytics projections into a local indexed store such as SQLite
- keep large clinical payloads and encrypted media as detailed records, but stop using them as the primary query surface

What this improves:

- faster case search and assignment flows
- quicker statistics screen open time
- better scalability without changing the privacy model

## P1. Head & Neck support is substantial, but still does not fully meet the blueprint contract

Current implementation found:

- 88 structured Head & Neck diagnoses in `client/lib/diagnosisPicklists/headNeckDiagnoses.ts`
- recipient vessel presets for `head_neck` in `client/lib/snomedApi.ts`
- MFC and omentum free flaps added to the model and procedure picklist
- a joint-case UI exists
- irradiated neck assessment exists

Blueprint fidelity gaps remain:

- `JointCaseContext` is too thin for an ablative/reconstructive two-team workflow
- the current type only stores partner specialty, consultant name, ablative surgeon ownership, and reconstruction timing
- it does not capture ablative procedure description, defect dimensions, or structures resected
- the joint-case section is only shown for `head_neck + flap`, not for the blueprint's broader "free flap or neck dissection context"
- fibula mandible classification is simplified to `I | II | III | IV` instead of the richer Brown subclassing requested in the blueprint
- irradiated vessel assessment does not yet model graft source, graft length, or explicit vessel-quality states in the blueprint's preferred form

Concrete references:

- `client/types/case.ts:594`
- `client/types/case.ts:749`
- `client/types/case.ts:1110`
- `client/types/case.ts:1423`
- `client/components/case-form/JointCaseContextSection.tsx:29`
- `client/components/case-form/CaseSection.tsx:31`
- `client/components/AnastomosisEntryCard.tsx:102`
- `client/lib/snomedApi.ts:290`
- `client/lib/procedurePicklist.ts:2331`
- `client/data/autoFillMappings.ts:232`

Why this matters:

- clinically, Head & Neck free flap logging is one of the most context-heavy parts of the product
- partial modeling creates the illusion of completeness while leaving important audit fields unavailable
- exports and analytics cannot become fully audit-grade if the upstream model is still incomplete

Recommendation:

- treat Head & Neck as a first-class domain module, not just a larger picklist
- define a dedicated Head & Neck reconstruction contract with:
  - joint case / ablative context
  - defect metadata
  - recipient vessel planning
  - irradiated neck / graft details
  - mandible defect classification and derived Jewer/HCL logic
- align naming with the blueprint before adding more fields so the model does not fork further

What this improves:

- true audit readiness for Head & Neck reconstruction
- better downstream exports and analytics
- less future rework when the module gets deeper clinical usage

## P2. Large god files are carrying too many responsibilities

Hotspots identified:

- `client/lib/procedurePicklist.ts` — 6,805 lines
- `client/components/DiagnosisGroupEditor.tsx` — 3,558 lines
- `client/screens/CaseDetailScreen.tsx` — 3,399 lines
- `client/lib/diagnosisPicklists/headNeckDiagnoses.ts` — 3,208 lines
- `client/types/case.ts` — 2,520 lines
- `client/hooks/useCaseForm.ts` — 2,061 lines
- `client/components/ProcedureClinicalDetails.tsx` — 1,871 lines

Why this matters:

- these files are acting as informal integration hubs
- review quality drops because every change carries unrelated context
- specialty work becomes merge-conflict-prone
- performance work becomes harder because concerns are not isolated

Recommendation:

- split `procedurePicklist.ts` by specialty and build indexes from module files at compile time
- turn `DiagnosisGroupEditor` into an orchestrator around specialty plug-ins rather than an everything-component
- split `CaseDetailScreen` into read-only section components with dedicated data selectors
- split `types/case.ts` into a domain folder with runtime labels separated from storage types

What this improves:

- clearer review boundaries
- lower merge-conflict frequency
- easier testing of specialty modules in isolation

## P2. There are dead abstractions and stale artifacts that should be deleted now

Confirmed dead or stale items:

- React Query is configured globally, but the client has no in-repo `useQuery` or `useMutation` usage
- `ProcedureModuleConfig.aiPrompt` and `getConfigForSpecialty()` exist, but the config abstraction is effectively only used to generate empty/default clinical detail objects
- `client/navigation/OnboardingNavigator.tsx` is an unused placeholder navigator with fake screens
- `client/components/hand-trauma/HandTraumaStructurePicker.tsx` is deprecated and unused
- `client/components/CaseCard.tsx` appears unused in favor of `client/components/dashboard/CaseCard.tsx`
- duplicate repo config files exist at the root: `.node-version 2`, `eas 2.json`, `railway 2.toml`

Concrete references:

- `client/lib/query-client.ts:127`
- `client/App.tsx:158`
- `client/lib/procedureConfig.ts:19`
- `client/lib/procedureConfig.ts:326`
- `client/navigation/OnboardingNavigator.tsx:25`
- `client/components/hand-trauma/HandTraumaStructurePicker.tsx:1`
- `client/components/CaseCard.tsx:1`

Why this matters:

- stale files quietly become false extension points
- future contributors lose time following the wrong path
- unused providers and abstractions add conceptual overhead without delivering value

Recommendation:

- remove unused libraries and providers unless there is an immediate activation plan
- delete placeholder navigators and deprecated components that are no longer referenced
- consolidate duplicate root config files
- if the procedure config abstraction is meant to drive UI, finish it; if not, trim it down to a pure defaults map

What this improves:

- lower cognitive load
- cleaner architecture docs
- less accidental coupling to dead code

## P2. The shared backend schema contains collaboration tables that are not part of the actual product path

Evidence:

- `teams` and `team_members` are present in `shared/schema.ts`
- there are no corresponding routes in `server/routes.ts`
- the client uses local `case.teamMembers` within the case model, not the server collaboration tables

Concrete references:

- `shared/schema.ts:219`
- `shared/schema.ts:265`
- `server/storage.ts:108`

Why this matters:

- the schema suggests a collaboration architecture that does not exist
- dead schema increases migration and maintenance noise
- the backend contract becomes harder to reason about

Recommendation:

- remove unused collaboration tables until the feature is real
- re-add them later behind a clear product decision and API surface

What this improves:

- a smaller and truer backend model
- less schema clutter and future confusion

## P2. Hygiene and CI discipline are drifting

Evidence:

- lint is currently failing
- the repo root contains duplicate config files
- the current branch is carrying in-flight edits unrelated to this audit

Why this matters:

- architectural work becomes harder to land cleanly when the repo baseline is already noisy
- developers lose trust in lint as a signal

Recommendation:

- make lint pass mandatory before architectural feature work continues
- add pre-commit or CI enforcement for formatting
- keep docs and report files out of the root if they are transient; prefer `docs/`

What this improves:

- cleaner review cycles
- less incidental noise while making structural changes

## Head & Neck Specific Assessment

Overall verdict:

- the Head & Neck module is directionally strong
- the picklist and free-flap coverage are materially improved
- the missing work is now mostly around model fidelity and export-grade structure, not simple list expansion

What is already in good shape:

- diagnosis coverage is broad and organized
- MFC and omentum are in the free flap model
- recipient vessel presets exist for Head & Neck
- irradiated neck logic exists in the UI
- joint-case capture exists at a minimal level

What still needs to be completed before calling it audit-ready:

- richer joint-case metadata
- proper mandible defect classification
- vessel graft details
- explicit neck-dissection and ablative context capture
- a dedicated Head & Neck summary/export layer so the data is not buried inside generic `clinicalDetails`

## Recommended Implementation Order

## Phase 1. Remove noise before adding more structure

- delete unused placeholder files and deprecated dead components
- remove duplicate root config files
- decide whether React Query is staying or going
- fix lint and format drift

Effect:

- lowers cognitive load immediately
- reduces the number of false architectural paths

## Phase 2. Rebuild the type boundary around the case model

- split `client/types/case.ts` into domain modules
- replace `Record<string, any>` in form state with typed module payloads
- remove deprecated fields now rather than supporting them longer
- stop using `as any` in case detail and specialty renderers

Effect:

- makes the codebase safer and easier to extend
- creates the foundation for elegant specialty modules

## Phase 3. Rework form state subscriptions for performance

- move away from whole-form context subscriptions
- adopt selector-based state access
- keep expensive specialty sections isolated from unrelated field changes

Effect:

- smoother form performance
- less rerender churn in large cases

## Phase 4. Finish Head & Neck as a real domain module

- complete the joint-case model
- add the remaining irradiated neck and defect classification fields
- align naming with the blueprint
- expose a dedicated Head & Neck export/summary layer

Effect:

- clinically coherent Head & Neck workflow
- audit-grade data capture instead of partial metadata

## Phase 5. Upgrade the metadata/query layer

- keep encrypted detailed records, but move searchable/queryable metadata to an indexed local store
- use summaries in modal pickers and dashboard flows by default
- precompute analytics-friendly projections on save

Effect:

- faster search, statistics, and assignment flows
- a better path to "blazing fast" without changing the local-first model

## Bottom Line

Opus is not a weak codebase. It is a strong product codebase that has reached the point where domain growth is outpacing architectural consolidation.

That is good news, because the fix is not "start over." The fix is:

- simplify aggressively
- delete stale layers now
- formalize the case model
- finish Head & Neck as a first-class domain instead of letting it remain an extension of generic free-text and generic clinical details

If we do those four things first, the next implementation phase will be much faster, much safer, and much more elegant.
