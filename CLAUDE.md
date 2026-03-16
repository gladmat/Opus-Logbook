# CLAUDE.md — Opus (Surgical Case Logbook)

## Project overview

**Opus** is a full-stack Expo/React Native surgical case logbook app for documenting surgical procedures, tracking post-operative outcomes, and generating analytics. Privacy-first design with on-device encrypted storage and E2EE scaffolding. Integrates RACS MALT fields for Australian surgical audit compliance.

Key capabilities: multi-specialty case logging, SNOMED CT coded diagnoses and procedures, free flap and anastomosis documentation, wound episode tracking, infection monitoring, treatment episodes, hand trauma workflow, multi-lesion sessions, app lock (PIN/biometric), favourites/recents, and data export (CSV/FHIR).

### Brand identity

- **Name:** Opus — used in all UI, emails, App Store listing
- **Mark:** The Interrupted Circle — open-arc SVG stroke rendered by `OpusMark` (`client/components/brand/OpusMark.tsx`)
- **Logo:** Horizontal lockup — mark left of "opus" wordmark via `OpusLogo` (`client/components/brand/OpusLogo.tsx`)
- **Canonical amber:** `#E5A00D` (golden amber). NOT `#D97706`.
- **App icons:** `client/assets/icons/app/opus-icon-1024.png` (dark bg), `opus-icon-light-1024.png` (light bg)

### v2.0 overhaul status

- **Phase 1 COMPLETE** — Form state refactor (useReducer, selector-based case form context, section components)
- **Phase 2 COMPLETE** — Charcoal+Amber theme, card-based diagnosis groups, section nav, summary view, specialty modules
- **Acute Hand Category COMPLETE** — 3-way hand surgery branching, acute diagnoses, hand infection 4-layer assessment, infection-to-overlay bridge
- **Phase 3 COMPLETE** — Inline validation, keyboard optimisation, haptic audit, duplicate case, favourites/recents
- **Phase 4 COMPLETE** — Data migration (schemaVersion 4), CSV/FHIR/PDF export, analytics dashboard
- **Elective Hand + Joint Implant COMPLETE** — 38 elective diagnoses, 7 subcategories, 3 arthroplasty with implant tracking, 26 implant catalogue entries
- **Skin Cancer Terminology Repair COMPLETE** — corrected SNOMED codes, rare malignancy metadata, UK-extension procedure codes
- **Media Overhaul COMPLETE** — unified MediaTag taxonomy (64 tags, 7 groups), 7 capture protocols, legacy migration, EXIF stripping, 5 UI components
- **Capture Pipeline A–H COMPLETE** — Opus Inbox (encrypted MMKV), Smart Import, Opus Camera (quick snap + guided), planned cases, smart assignment, auto-organise, NHI auto-match, transactional reservation lifecycle, iOS native scaffold (widget + locked-camera + deep links)
- **Media Encryption Remediation COMPLETE** — v1/v2 delete parity, temp cache sweeping, FlashList for large libraries
- **Case Category Repair COMPLETE** — edit-mode specialty preservation, conservative storage repair
- **Patient Identity COMPLETE** — structured name/DOB/NHI, per-user HMAC-SHA256, country-aware UI, CSV/FHIR/PDF export
- **Operative Role & Supervision COMPLETE** — 3-dimensional role model, 6 export format mappings, legacy migration
- **UX Polish COMPLETE** — FAB animation, compact PatientInfoSection, day-case auto-fill, 30-day RACS MALT audit, plan mode toggle
- **Head & Neck Progressive Disclosure COMPLETE** — CompactProcedureList (shared by breast + H&N), HeadNeckDiagnosisPicker (88 diagnoses, 9 subcategories)
- **Hand Elective UX + Dupuytren Module COMPLETE** — reconstruction pathway multi-select pending actions, elective hand laterality simplified to Left/Right only, trigger finger per-finger multi-select, Dupuytren's split into primary/recurrent/palm-only diagnoses with DupuytrenAssessment component (per-ray MCP/PIP measurement, auto-calculated Tubiana staging, first web space, diathesis features, previous treatment tracking), removed flat Tubiana staging config, CSV/FHIR export support, 37 tests
- **Phase 5 IN PROGRESS** — Version 2.5.0, EAS config done (dev/preview/production profiles), pending manual regression + TestFlight submission

## Tech stack

| Layer          | Technology                                                     | Version                                                     |
| -------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Framework      | Expo                                                           | 54                                                          |
| UI             | React Native                                                   | 0.81.5                                                      |
| React          | React                                                          | 19.1.0                                                      |
| Language       | TypeScript                                                     | 5.9.2                                                       |
| Navigation     | React Navigation                                               | 7 (@native 7.1.8, @native-stack 7.3.16, @bottom-tabs 7.4.0) |
| Animation      | React Native Reanimated                                        | 4.1.1                                                       |
| Camera         | expo-camera                                                    | 17.0.10                                                     |
| Native Targets | @bacons/apple-targets                                          | 4.0.6                                                       |
| Backend        | Express 4.21.2, Drizzle ORM 0.39.3, PostgreSQL                |
| Encryption     | @noble/ciphers 2.1.1, @noble/curves 2.0.1, @noble/hashes 2.0.1 |
| Validation     | Zod 3.25.76 (+ drizzle-zod 0.7.1)                              |
| Testing        | Vitest                                                         | 4.0.18                                                      |
| Build          | Expo/EAS (client), esbuild via tsx (server)                    |

## Commands

```bash
npm run dev:mobile     # Watch-mode API + Expo Go on LAN for device testing
npm run server:dev     # Express API server (port from .env, default 5001)
npm run expo:dev       # Expo only (LAN host, port 8083)
npm run db:push        # Push Drizzle schema to PostgreSQL
npm run server:build   # Production server build → server_dist/
npm run server:prod    # Run production server
npm run lint           # ESLint
npm run check:types    # TypeScript type-check (tsc --noEmit)
npm run format         # Prettier
npm run test           # Vitest (run once)
npm run test:watch     # Vitest (watch mode)
```

## Local development

1. PostgreSQL running locally (Homebrew `postgresql@16`)
2. `.env` in project root: `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `PORT` (use 5001 — port 5000 conflicts with macOS AirPlay), `NODE_ENV`
3. `npm install` then `npm run db:push`
4. `npm run dev:mobile` for device testing (default workflow)

## Project structure

```
client/
  App.tsx                        # Root: providers + deep-link routing + locked-capture ingress
  screens/                       # 29 screens + 9 onboarding sub-screens
  components/                    # 160+ files across 18 subdirectories
    case-form/                   # 5 sections + CollapsibleFormSection, SectionNavBar, CaseSummaryView
    dashboard/                   # 10 files — dashboard v2 (see Dashboard v2 section)
    statistics/                  # BarChart, HorizontalBarChart, StatCard, MilestoneTimeline, SpecialtyDeepDiveCard
    hand-trauma/                 # 15 files — unified hand trauma assessment
    hand-infection/              # HandInfectionCard — 4-layer progressive disclosure
    hand-elective/               # HandElectivePicker — chip-based elective hand diagnosis selector
    acute-hand/                  # AcuteHandAssessment + AcuteHandSummaryPanel
    dupuytren/                   # DupuytrenAssessment — per-ray measurement + auto Tubiana staging
    joint-implant/               # JointImplantSection — 3-layer progressive disclosure
    skin-cancer/                 # 14 files — inline skin cancer assessment module
    head-neck/                   # HeadNeckDiagnosisPicker — chip-based, 88 diagnoses, 9 subcategories
    breast/                      # 18 files — BreastAssessment, side cards, implant/flap/lipofilling
    media/                       # MediaTagBadge, MediaTagPicker, ProtocolBadge, CaptureStepCard, GuidedCaptureFlow
    brand/                       # OpusMark, OpusLogo
    detail-sheets/ onboarding/ shared/ staging/
  contexts/                      # AuthContext, CaseFormContext, AppLockContext, MediaCallbackContext
  hooks/                         # useCaseForm, useCaseDraft, useTheme, useStatistics, useDecryptedImage, etc.
  lib/                           # 75+ files — storage, encryption, export, migration, selectors, etc.
    diagnosisPicklists/          # 12 specialty picklists + lazy-loaded index
    __tests__/                   # 44 test files
  types/                         # case, media, inbox, episode, infection, skinCancer, breast, dupuytren,
                                 #   handInfection, wound, jointImplant, operativeRole, etc.
  constants/                     # theme.ts (design tokens), categories, hospitals, trainingProgrammes
  data/                          # AO codes, flap configs, implant catalogue, capture protocols, clinical data
  navigation/                    # RootStack → Auth/Onboarding/Main; Main = Dashboard + Statistics + Settings tabs
targets/
  _shared/                       # Shared Swift constants + CameraCaptureIntent
  opus-camera-control/           # Inbox widget + Control Center capture control
  opus-locked-camera/            # LockedCameraCapture extension scaffold
server/
  app.ts, routes.ts              # Express API (~41 endpoints), security headers, CORS, body parsing
  storage.ts                     # DatabaseStorage with ownership checks
  snomedApi.ts                   # Ontoserver FHIR integration
  email.ts                       # Resend email service
  diagnosisStagingConfig.ts      # Dynamic staging form definitions
  __tests__/                     # 3 test files (auth, validation, staging config)
shared/
  schema.ts                      # Drizzle ORM table definitions, 8 tables
migrations/                      # 4 SQL migration files
```

## Architecture

### Provider hierarchy (App.tsx)

```
ErrorBoundary → ThemeProvider → AuthProvider
  → AppLockProvider → MediaCallbackProvider → SafeAreaProvider
    → GestureHandlerRootView → KeyboardProvider
      → ThemedNavigationContainer → RootStackNavigator
```

### Navigation flow

Auth → Onboarding → Main (bottom tabs: Dashboard, Statistics, Settings) with modal stack for case entry/detail/episodes. Headers use solid `theme.backgroundRoot` (no blur/transparency, no shadow). Configured centrally via `useScreenOptions()` (`client/hooks/useScreenOptions.ts`). Screens do NOT use `useHeaderHeight()` — `headerTransparent: false` means content starts below the header automatically.

### Data flow

- **Local cases:** Encrypted in AsyncStorage (offline-first). Draft auto-save via `useCaseDraft.ts` (debounced + AppState background flush). Summary indexes are persisted separately so list/dashboard/episode surfaces do not need to hydrate full cases eagerly.
- **Form state:** `useCaseForm()` hook → `useReducer` with 15+ actions (`SET_FIELD`, `SET_FIELDS`, `RESET_FORM`, `LOAD_CASE`, `LOAD_DRAFT`, `ADD_TEAM_MEMBER`, `REMOVE_TEAM_MEMBER`, `ADD_ANASTOMOSIS`, `UPDATE_ANASTOMOSIS`, `REMOVE_ANASTOMOSIS`, `ADD_DIAGNOSIS_GROUP`, `REMOVE_DIAGNOSIS_GROUP`, `UPDATE_DIAGNOSIS_GROUP`, `REORDER_DIAGNOSIS_GROUPS`, `UPDATE_CLINICAL_DETAIL`). `CaseFormContext` now exposes selector-based subscriptions plus separate actions/validation contexts so unchanged sections do not rerender on unrelated edits.
- **Server state:** Direct API helpers built on `getApiUrl()` + `fetch`.
- **Auth state:** `AuthContext` with JWT tokens, profile, facilities, device keys.
- **Patient privacy:** Identifiers HMAC-SHA256 hashed in local case index (per-user key in iOS Keychain). Patient identity fields (`patientFirstName`, `patientLastName`, `patientDateOfBirth`, `patientNhi`) stored on-device only, stripped before server sync via `stripPatientIdentityForSync()`. Legacy SHA-256 hashes detected by absence of `hmac:` prefix and lazily migrated.

### Multi-diagnosis group architecture

Each Case has `diagnosisGroups: DiagnosisGroup[]` instead of flat diagnosis/procedures fields. Each group bundles: specialty, diagnosis, staging, fractures, procedures, and optional `handInfectionDetails`. `procedureSuggestionSource` tracks origin: `"picklist"`, `"skinCancer"`, `"acuteHand"`, or `"manual"`. Enables multi-specialty cases (e.g., hand surgery + orthoplastic in one session). Old cases auto-migrated on load via `client/lib/migration.ts`, and clearly recoverable top-level specialty regressions are conservatively repaired via `client/lib/caseSpecialty.ts`. Helpers: `getAllProcedures(c)`, `getCaseSpecialties(c)`, `getPrimaryDiagnosisName(c)` in `client/types/case.ts`.

### Case form sections (5-tab architecture)

`CaseFormScreen.tsx` delegates to 5 section components via `CaseFormContext`. All 5 pills are visible simultaneously on any iPhone (no horizontal scrolling):

1. `PatientInfoSection` (`patient`) — Patient identity (NHI/name/DOB for NZ, generic identifier for non-NZ), privacy indicator, procedure date, facility, demographics
2. `CaseSection` (`case`) — Wraps `DiagnosisProcedureSection` (diagnosis groups, specialty-specific UI) + conditional `TreatmentContextSection` (flap cases only)
3. `OperativeSection` (`operative`) — 4 sub-groups: Admission & Timing (urgency, stay type, dates, surgery times), Team & Anaesthesia (role, anaesthetic, operating team), Surgical Factors (wound risk, prophylaxis), Patient Factors (ASA, smoking, BMI, comorbidities — collapsed by default)
4. `OperativeMediaSection` (`media`) — Operative photos with capture protocols
5. `OutcomesSection` (`outcomes`) — Discharge outcome, mortality classification, collapsible 30-day RACS MALT audit (unplanned readmission/ICU/return to theatre), MDM, infection documentation. Day-case auto-fills "Discharged home"

Plus: `CollapsibleFormSection` (card wrapper), `SectionNavBar` (fixed-width pill navigation), `CaseSummaryView` (read-only 5-card review gating save with validation).

Header uses a truncating centered title. Header right is compact: overflow icon for Clear/Revert + Save button. `CollapsibleFormSection` now measures closed content safely so default-collapsed sections like Treatment Context open reliably on first tap. SectionNavBar has no bottom border.

### Edit mode

- Restores `clinicalDetails`, `recipientSiteRegion`, `anastomoses` from existing case data
- Uses actual `clinicalDetails` state (not placeholder) in save payload
- Preserves the stored top-level specialty/category on edit; does not silently fall back to `general`
- Gates edit-mode save/render on successful existing-case load, with explicit loading/error states
- Draft loading skipped in edit mode (`isEditMode` guard)
- All field setters use `?? ""` / `?? defaultValue` (unconditional) so cleared fields persist
- `handleSaveRef.current` always points to latest `handleSave` closure

## Database schema (PostgreSQL, 8 tables)

Defined in `shared/schema.ts`. All PKs are UUIDs via `gen_random_uuid()`. Cascade deletes on user deletion.

Tables: `users` (auth + tokenVersion for JWT revocation), `profiles` (1:1 with JSONB professionalRegistrations + surgicalPreferences), `user_facilities`, `user_device_keys` (X25519 E2EE), `password_reset_tokens` (single-use, 1hr expiry), `teams`, `team_members`, `snomed_ref`.

**Performance indexes** (`migrations/add_performance_indexes.sql`): 8 additional indexes on high-frequency query paths. All `IF NOT EXISTS`.

## API endpoints (server/routes.ts)

~41 endpoints under `/api/`, JWT bearer auth via `authenticateToken` middleware. See `server/routes.ts` for full details.

**Groups:** Auth (rate-limited, 8 endpoints including signup/login/refresh/password-reset), Profile (CRUD + avatar), Facilities (CRUD with isPrimary auto-clear), Device Keys (E2EE key management), Anastomoses (CRUD), Treatment Episodes (CRUD), Procedure Outcomes (CRUD), SNOMED CT (live search via Ontoserver + reference data for vessels/flaps/regions/coupling), Staging (14 configs), Health check.

**Non-obvious:** Auth rate-limited. Password reset always returns success (no email leak). Avatar upload capped at 5MB via Multer. `seed-snomed-ref` is dev-only (env-gated).

## Supported specialties

12 specialties defined in `client/types/case.ts`:

- Hand surgery (`hand_wrist`), Orthoplastic, Breast, Body contouring, Burns, Head & neck, Aesthetics, General
- Plus: Cleft/Craniofacial (`cleft_cranio`), Skin cancer, Lymphoedema, Peripheral nerve

Each has: dedicated diagnosis picklist, specialty colour, SVG icon, procedure subcategories.

## Key features

### Procedure picklists & SNOMED CT

509 procedures across all specialties in `client/lib/procedurePicklist.ts`. Each entry has SNOMED CT codes, specialty tags, subcategory. All specialties use the subcategory picker UI. SNOMED code migration (`client/lib/snomedCodeMigration.ts`) transparently updates old codes on load.

### Diagnosis-to-procedure suggestions

286 structured diagnoses across specialties with procedure suggestions (staging-conditional). Selecting a diagnosis auto-populates default procedures. Components: `DiagnosisPicker`, `ProcedureSuggestions`.

### Procedure-first (reverse) entry

When procedures are picked without a diagnosis, a "What's the diagnosis?" card appears with smart suggestions via reverse-mapping. Built lazily in `client/lib/diagnosisPicklists/index.ts` (`getDiagnosesForProcedure`). UI: `DiagnosisSuggestions.tsx` wired into `DiagnosisGroupEditor.tsx`.

### Unified hand surgery workflow

3-way case type selector for `hand_wrist` specialty: **Trauma** / **Acute** / **Elective**. Selection gates all downstream UI.

**Acute flow** (`AcuteHandAssessment`, `client/components/acute-hand/`):

- 13 curated diagnosis chips in 2 groups: Hand Infections (10) and Acute Non-Infection (3)
- SNOMED search fallback below curated chips for rare diagnoses
- Infection diagnoses auto-populate `HandInfectionCard` (4-layer progressive disclosure: type/digits/organism/antibiotic/severity/Kanavel)
- `handInfectionToOverlay` / `overlayToHandInfection` bridge (`client/lib/handInfectionBridge.ts`) syncs to case-level `InfectionOverlay`
- Escalation to full infection module when complexity exceeds inline card
- Accept-mapping flow with `AcuteHandSummaryPanel` (diagnosis headline, infection key facts, procedure checkboxes, coding details with SNOMED codes)
- Dashboard surfaces non-escalated hand infections with spreading/systemic severity in Needs Attention
- CSV export: 6 new columns (hand_infection_type/digits/organism/antibiotic/severity/kanavel)
- FHIR export: hand infection as extension on Condition resource
- Tests: `client/lib/__tests__/handInfection.test.ts` (42 tests)

**Trauma flow** (`HandTraumaAssessment`, `client/components/hand-trauma/`):
Single inline `HandTraumaAssessment` inside `DiagnosisGroupEditor`.

**Trauma flow:**

1. Mandatory Left/Right selection, injury mechanism, injury date
2. 7-chip injury category grid: Fracture, Dislocation, Tendon, Nerve, Vessel, Soft Tissue, Amputation
3. Digit/ray selection → structure-specific pickers per category
4. AO fracture integration (carpal, metacarpal 77, phalanx 78)
5. Per-digit amputation levels, per-location soft tissue defects (repeatable `DefectLocation` cards with zone/surface/size/digit assignment)
6. Deterministic diagnosis rendering via `MachineSummary` (shorthand/full English/Latin) in `handTraumaDiagnosis.ts`
7. Diagnosis-procedure pair mapping in `handTraumaMapping.ts` with per-pair composite key selection (`pairKey::procedureId`)
8. Fracture pairs: mutually-exclusive chips (ORIF, CRIF+K-wire, CRIF+CCS, CRIF+Ex-Fix). Nerve pairs: Primary repair / Nerve graft / Conduit. Vessel pairs: Primary repair / Vein graft (+ Revascularisation when perfusion impaired)
9. Accept Mapping → collapses to summary card; later edits invalidate acceptance

Tests: `client/lib/__tests__/handTraumaDiagnosis.test.ts`, `handTraumaMapping.test.ts`, `handTraumaUx.test.ts`.

**Elective flow** (`HandElectivePicker`, `client/components/hand-elective/`):

- 38 structured diagnoses across 7 subcategories: Dupuytren's Disease (7), CTS & Nerve Compression (7), Arthritis & Joint (8), Tendon Conditions (5), Ganglion & Tumour (4), Deformity & Reconstruction (4), Other Elective (3)
- Chip-based subcategory picker with expandable diagnosis list per category
- 11 new procedures including 3 arthroplasty procedures with `hasImplant: true` flag (CMC1, PIP, MCP arthroplasty)
- 3 new staging configurations: Tubiana-Dupuytren (5 grades), CTS-Severity (3 levels), Quinnell-Trigger (5 grades)
- Staging auto-activates when diagnosis has `stagingSnomedCode` matching server config
- Integrates with `JointImplantSection` for arthroplasty procedures (see Joint Implant Tracking below)
- **Dupuytren sub-module:** `DupuytrenAssessment` (`client/components/dupuytren/`), types in `client/types/dupuytren.ts`, helpers in `client/lib/dupuytrenHelpers.ts`. Primary/recurrent/palm-only diagnoses with per-ray MCP/PIP measurement, auto-calculated Tubiana staging, first web space, diathesis features, previous treatment tracking.
- Tests: `client/lib/__tests__/handElective.test.ts` (52 tests), `dupuytren.test.ts` (37 tests)

### Joint implant tracking

Registry-grade implant documentation for arthroplasty procedures, activated when any procedure has `hasImplant: true` in the picklist.

**Architecture:**

- `JointImplantSection` (`client/components/joint-implant/`) — 3-layer progressive disclosure
- `implantCatalogue.ts` (`client/data/`) — 26 entries across 3 joint types (CMC1, PIP, MCP) from 5 manufacturers
- `jointImplant.ts` (`client/types/`) — `JointImplantDetails` type, `ImplantCatalogueEntry`, `ImplantSizeConfig` union (`"unified"` | `"components"` | `"matched"`)

**Activation chain:**

1. Diagnosis selected with arthroplasty procedure suggestion → procedure has `hasImplant: true`
2. `procedureHasImplant()` in `moduleVisibility.ts` detects the flag
3. `DiagnosisGroupEditor` renders `JointImplantSection` below procedure list
4. `PROCEDURE_TO_JOINT_TYPE` auto-derives joint type; `DIAGNOSIS_TO_INDICATION` auto-derives indication

**3-layer progressive disclosure:**

- Layer 0 (auto-derived): joint type + indication set from procedure/diagnosis context
- Layer 1 (always visible): implant system picker, size picker (adapts to `ImplantSizeConfig` type), approach selector
- Layer 2 (expandable): fixation, bearing surface, procedure type (primary/revision), revision fields, grommets toggle (Swanson MCP only), catalogue/lot/UDI tracking

**Data integration:**

- `implantDetails` stored on `CaseProcedure` alongside `clinicalDetails`
- `buildDuplicateState()` clones `implantDetails` for case duplication
- CSV export: 6 columns (implant_system, implant_size, implant_fixation, implant_approach, implant_bearing, implant_joint_type)
- FHIR export: `Device` resource with manufacturer, UDI carrier, lot number, model number, linked to Procedure via `focalDevice`
- PDF export: "Implant" column with compact summary (system · size · approach · fixation · bearing)
- CaseDetailScreen: full implant detail rows (system, joint, indication, size, approach, fixation, bearing, revision info, catalogue/lot/UDI)

Tests: `client/lib/__tests__/jointImplant.test.ts` (44 tests)

### Skin cancer assessment module

Inline assessment flow (mirrors hand trauma pattern — no modal, no separate screen) with 14 components in `client/components/skin-cancer/`, config logic in `client/lib/skinCancerConfig.ts` (1058 lines), and types in `client/types/skinCancer.ts` (629 lines).

**Current runtime model: 2 pathways only**

- **Excision biopsy** — lesion not yet pathologically confirmed. Surgeon records biopsy method (Excision / Incisional / Shave / Punch) and can later return to enter definitive specimen histology in the same pathway.
- **Histology known** — prior biopsy or previously confirmed pathology is already available. Prior histology is captured separately from the current procedure histology.

There is **no continuing-care pathway** in the product model. Re-excision / follow-up uses duplicate-and-prefill within the same two-pathway system.

**Progressive disclosure sections (numbered, collapsible SectionWrapper cards):**

1. **Diagnosis** — 7 Tier 1 pathology category chips (BCC, SCC, Melanoma, MCC, Other malig., Benign, Uncertain). Switching categories preserves lesion location/photos but clears incompatible downstream state. Pathway stage is internal only: `Uncertain` auto-routes to `excision_biopsy`; all other categories auto-route to `histology_known`.
2. **Melanoma quick Breslow** — compact mirrored Breslow thickness row shown before prior histology in the melanoma / histology-known flow so margin and SLNB guidance updates earlier.
3. **Prior histology** — shown for `histology_known`. Captures prior biopsy pathology, subtype detail, excision method, margin status, and exposes re-excision follow-up CTA when margins are incomplete / close.
4. **Lesion details** — grouped HEAD & NECK / TRUNK / UPPER LIMB / LOWER LIMB site picker, laterality (auto-midline for midline sites), clinical dimensions, encrypted lesion photo capture with auto-captioning.
5. **Margin recommendation badge** — guideline CDS using text/range output (`5mm`, `3-4mm`, `1-2cm`, `>=2cm`) instead of collapsing ranges to a single numeric mm value.
6. **SLNB** — auto-offered for melanoma >0.8mm or ulcerated and for Merkel cell; can also be manually considered for selected high-risk SCC / rare malignant patterns. Existing saved SLNB data keeps the section visible.
7. **Biopsy / Excision** — biopsy pathway shows biopsy method + conditional fields; histology-known pathway uses simplified current-procedure excision planning (`HistologySection` simplified mode) with compact excision + peripheral margin layout.
8. **Specimen histology** — full structured `currentHistology` editor used as the return-to-update flow for final pathology and margin status. In biopsy-path initial logging it stays hidden until the case is reopened or current histology already exists.
9. **MDT toggle** — simple `discussedAtMdt` flag for the histology-known pathway.
10. **Summary & Procedures** — interactive suggested procedures with only the primary procedure preselected by default, coding details, accept/edit mapping, and completion summary.

**Histology precedence rules:**

- `currentHistology` is the authoritative post-procedure record when present.
- Summaries, CDS, badges, and lesion captions use `getSkinCancerPrimaryHistology()` to prefer current definitive histology over prior context.
- `priorHistology` remains contextual history rather than the primary displayed result once current histology exists.

**Procedure suggestions** (`getSkinCancerProcedureSuggestions`): category + site aware. Head/neck vs body excision variants, coverage suggestions (FTSG, STSG, local flaps) across broader excision flows, site-specific reconstruction for lip/ear/eyelid, and SLNB procedure inclusion when performed.

**Diagnosis resolution** (`resolveSkinCancerDiagnosis`):\*\*

- biopsy-stage cases remain coded as generic "awaiting histology" until `currentHistology.pathologyCategory` is actually confirmed
- confirmed histology resolves to the correct picklist diagnosis where supported
- rare malignant subtypes without a dedicated picklist entry return explicit manual-review metadata instead of silently falling back to "awaiting histology"
- `client/lib/migration.ts` reconciles legacy single-lesion skin-cancer diagnoses on load

**Follow-up / episode behaviour:**

- `useCaseForm.ts` now creates or reuses `cancer_pathway` episodes for pending biopsy lesions, persists the linked `episodeId`, recomputes `episodeSequence`, and syncs pending action (`awaiting_histology`, `awaiting_reexcision`, resolve)
- re-excision CTA launches a duplicate-and-prefill follow-up case seeded from the current in-form skin-cancer state
- `skinCancerEpisodeHelpers.ts` contains pure helpers for pending lesion collection, episode link/update plans, and follow-up assessment transforms

**Input handling:**

- skin-cancer numeric fields use a shared draft-preserving `SkinCancerNumericInput` so decimal entry (`0.`, `.5`, deletes, quick edits) does not get rewritten mid-typing by parse-on-change logic

**Key components:**

- `SkinCancerAssessment` — main orchestrator, controlled collapse state, scroll stabilization, internal pathway auto-routing, summary wiring, completion summary
- `PathologySection` — prior histology editor for `histology_known`
- `HistologySection` — simplified excision planner or full structured current histology editor
- `SkinCancerSummaryPanel` — accept/edit mapping UI with diagnosis resolution details and rare-type review notes
- `MarginRecommendationBadge` — text/range-based margin CDS
- `SLNBSection` — sentinel lymph node assessment
- `SkinCancerNumericInput` — draft-preserving numeric field wrapper for Breslow, margins, lesion size, and other decimal inputs
- `ReExcisionPromptCard` — launches duplicate follow-up flow instead of showing obsolete continuing-care instructions

**Multi-lesion session:** 3-6 skin lesion excisions from one operative session as discrete entries within a single diagnosis group. `MultiLesionEditor` uses per-lesion `SkinCancerAssessment` rows and pathway badges.

Tests: `client/lib/__tests__/skinCancerConfig.test.ts` (89 tests), `skinCancerPhase4.test.ts` (11 tests), `skinCancerPhase5.test.ts` (18 tests). Total focused skin-cancer suite: **125 tests**.

### Standalone histology entry

`AddHistologyScreen` provides a focused return-to-histology flow for adding or updating pathology results on existing cases. Accessed via dashboard quick action buttons or CaseDetailScreen.

- **Layout:** Padded scroll column with intro copy, context card, and a branded form card. No edge-to-edge bleed.
- **Skin cancer cases:** Shows `HistologySection` in pending/full mode with `hideSource` (always own procedure) and `hideHeader`. Saves `currentHistology` back to the appropriate diagnosis group or lesion instance.
- **General cases:** Shows a compact structured histology form for non-skin-cancer cases with `diagnosisCertainty === "clinical"`: pathology category, report text, margin status, and optional SNOMED code/display.
- **`caseCanAddHistology()`** — broad check in `skinCancerConfig.ts`: returns true for any case with a `skinCancerAssessment` on any group or lesion, or `diagnosisCertainty === "clinical"`.
- **`getFirstHistologyTarget()`** — two-pass targeting: first prioritises excision-biopsy groups awaiting histology, then falls back to any group with skin cancer assessment.
- **`caseNeedsHistology()`** — narrow check used by dashboard attention filter: only returns true when histology is actually pending (no `currentHistology` set yet).

### Media tag system & capture protocols

**Unified MediaTag taxonomy** replaces the legacy dual `OperativeMediaType` (8 values) + `MediaCategory` (20 values) system with a single `MediaTag` type (64 tags across 7 groups: temporal, imaging, flap_surgery, skin_cancer, aesthetic, hand_function, other). Defined in `client/types/media.ts` — single source of truth.

**Key types & exports:**

- `MediaTag` — union of 64 string literals, one per media item
- `MediaTagGroup` — 7 group identifiers for UI sectioning
- `MEDIA_TAG_REGISTRY` — complete metadata: label, group, sortOrder, captureHint per tag
- `MEDIA_TAG_GROUP_LABELS` — display names for group tabs
- `getTagsForGroup(group)` — sorted tags within a group
- `getRelevantGroups(specialty?, procedureTags?, hasSkinCancerAssessment?)` — context-aware group filtering. Always includes temporal/imaging/other; conditionally adds flap_surgery, skin_cancer, aesthetic, hand_function based on case context. Skin cancer groups are diagnosis-driven via `hasSkinCancerAssessment` flag (not specialty-gated).

**Legacy migration** (`client/lib/mediaTagMigration.ts`):

- `migrateOperativeMediaType(type)` — maps all 8 old types to MediaTag
- `migrateMediaCategory(category)` — maps all 20 old categories to MediaTag
- `resolveMediaTag({ tag?, category?, mediaType? })` — cascading fallback: tag → category → mediaType → "other"
- `suggestTemporalTag(procedureDate?)` — auto-suggests temporal MediaTag based on days since procedure (preop → intraop → postop_early → postop_mid → followup_3m/6m/12m → followup_late). Uses `parseDateOnlyValue()` for timezone-safe parsing.
- Both `MediaAttachment.tag` and `OperativeMediaItem.tag` fields added; legacy fields `@deprecated`

**Capture protocols** (`client/data/mediaCaptureProtocols.ts`):

- 7 data-driven checklists: Free Flap (11 steps), Skin Cancer Excision (8), Rhinoplasty (7), Face (5), Breast (8), Body Contouring (8), Hand Surgery (8)
- `CapturePhase` type: `"preop" | "intraop" | "postop"` — assigned to every protocol step for phase-filtered templates
- `filterStepsByPhase(steps, mode)` — returns all steps for `"full"` mode, only matching phase for `"preop"`
- `findProtocols(specialty, procedureTags, hasSkinCancerAssessment)` — returns matching protocols
- `findProtocol(id)` — lookup by protocol ID
- `mergeProtocols(protocols)` — combines multiple protocols with deduplication and section dividers
- Protocols are suggested, never enforced — no save gating

**UI components** (`client/components/media/`):

- `MediaTagBadge` — colour-coded chip showing tag label with group-specific colouring
- `MediaTagPicker` — grouped tag selector with horizontal scroll tabs + chip grid
- `ProtocolBadge` — protocol progress summary ("Free Flap · 4/11")
- `CaptureStepCard` — individual protocol step card (empty/captured states)
- `GuidedCaptureFlow` — protocol-driven capture checklist (horizontal CaptureStepCard scroll, step-to-media matching via tag, "{captured}/{total}" counter)
- All `React.memo` wrapped, wired into AddOperativeMediaScreen, MediaManagementScreen, and OperativeMediaSection

**EXIF stripping:** `getImageBytesFromUri()` in `thumbnailGenerator.ts` inherently strips all EXIF metadata (GPS, device serial, timestamps) by re-encoding through ImageManipulator. No separate stripping step needed — the save pipeline calls `getImageBytesFromUri()` once, avoiding double-encoding.

### Free flap / orthoplastic documentation

- `PICKLIST_TO_FLAP_TYPE` map in `procedurePicklist.ts` auto-populates `flapType`
- 18 free flap types via `FreeFlapPicker`
- Config-driven fields via `flapFieldConfig.ts` (~100 typed fields)
- Donor vessel auto-population by flap type
- Recipient site regions (10 regions including Knee) with vessel presets
- Simplified anastomosis documentation via `AnastomosisEntryCard` with segmented buttons
- Coupler constraint: selecting "Coupler" auto-sets "End-to-End" and locks other options
- **Ischaemia: total only.** Warm/cold ischaemia split removed from all free flap types — not clinically meaningful for flap transfer logging. Only `ischemiaTimeMinutes` is captured.
- **Bilateral DIEP:** Generates two `CaseProcedure` entries (one per side) with independent `freeFlapDetails`, `laterality`, and flap outcomes. Stacked/bipedicled DIEP is NOT split. "Copy to Other Side" button in FreeFlapSheet copies protocol/setup fields but not intraop measurements.
- **Breast anastomosis pre-fill:** All breast free flaps to `breast_chest` auto-fill IMA/IMV recipient vessels, flap-type-specific donor vessels, `end_to_end` configuration, and 2.5mm coupler size on the venous entry. `FLAP_DONOR_VESSELS` shared constant in `autoFillMappings.ts`.

### Wound episode tracker

Serial wound assessment as timeline event type (`wound_assessment`). `WoundAssessmentForm` with 11 sections: dimensions (auto-area), TIME classification, surrounding skin, dressing catalogue (40+ products), healing trend, intervention notes, next review. `WoundDimensionChart` SVG line chart for wound area over time.

### Infection documentation

`InfectionOverlayForm` attachable to any specialty. Quick templates (Abscess, NecFasc, Implant Infection), infection syndromes (Skin/Soft Tissue, Deep, Bone/Joint), serial episode tracking, microbiology data with resistance flags. Dashboard shows active infection cases with statistics.

### Treatment episodes

Serial case tracking via local encrypted episode storage. Episode status machine: planned → active ⇄ on_hold → completed. 7 episode types, 4 encounter classes, 9 pending actions. Types in `client/types/episode.ts`. UI: `EpisodeListScreen`, `EpisodeDetailScreen`, `InlineEpisodeCreator`, `EpisodeLinkBanner`.

### Dashboard v2 (COMPLETE)

The dashboard is a **surgical triage surface** — density-first, optimised for 5–10 second scan sessions. All 5 phases + post-launch refinements complete.

#### Locked architectural decisions

| Decision                | Locked value                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard philosophy    | Density-first. NOT clarity-first, NOT feed-first.                                                                                                                      |
| Zone order (top→bottom) | Filter Bar → Needs Attention → Practice Pulse → Recent Cases                                                                                                           |
| Primary action          | FAB speed dial (bottom-right, 56px amber main + 44px mini-FABs). Three actions: Log a Case (amber, closest to thumb), Quick Capture, Guided Capture. NOT a header button. |
| Header                  | Centered `HeaderTitle` lockup (Opus logo + subtitle). Inbox icon (with badge) + Search button on the right. NO greeting.                                               |
| Statistics              | Numbers + deltas only on dashboard. NO charts. Charts live on the dedicated Statistics tab.                                                                            |
| Notifications           | Zone 1 presence/absence IS the notification. NO red dots, NO badge counts.                                                                                             |
| Customisation           | None. One excellent default. Specialty filter is the only personalisation.                                                                                             |
| Zone 1 empty behaviour  | Returns `null`. NOT an empty View, NOT a placeholder. Zone does not exist when 0 items.                                                                                |

#### Component registry

```
client/components/dashboard/
  SpecialtyFilterBar.tsx       # Zone 0 — sticky horizontal chip bar
  NeedsAttentionCarousel.tsx   # Zone 1 — horizontal FlatList of AttentionCards + persistent "View all"
  AttentionCard.tsx             # Zone 1 — inpatient, infection, or episode card with quick actions
  PracticePulseRow.tsx          # Zone 2 — 3-metric row container
  PulseMetricCard.tsx           # Zone 2 — individual metric card (thisMonth/thisWeek/completion)
  InfoButton.tsx                # Zone 2 — info popover for metric explanations
  RecentCasesList.tsx           # Zone 3 — mapped CaseCard list with quick actions
  CaseCard.tsx                  # Zone 3 — individual case row with thumbnail + action buttons
  AddCaseFAB.tsx                # Speed dial FAB: animated mini-FAB fan-out (Log/Capture/Plan)
  DashboardEmptyState.tsx       # Zero-case state

client/hooks/
  usePracticePulse.ts           # Computes thisMonth/thisWeek/completion via shared selectors
  useAttentionItems.ts          # Merges inpatients + infections + episodes via shared selectors

client/lib/
  dashboardSelectors.ts         # Shared dashboard counts, filters, attention-item shaping, pulse, quick-log params
```

#### DashboardScreen layout structure

```tsx
<View style={{ flex: 1 }}>
  <ScrollView stickyHeaderIndices={[0]}>
    <SpecialtyFilterBar /> {/* index 0 — sticky */}
    <NeedsAttentionCarousel /> {/* null when 0 items */}
    <PracticePulseRow /> {/* null when 0 total cases */}
    <RecentCasesList /> {/* or DashboardEmptyState */}
  </ScrollView>
  <AddCaseFAB /> {/* position: absolute, outside ScrollView */}
</View>
```

#### Design rules specific to dashboard

- **All components use `theme.*` tokens.** No raw hex values in dashboard-specific UI.
- **No nested FlatList inside the ScrollView.** RecentCasesList renders as a mapped array. Only NeedsAttentionCarousel uses a FlatList (horizontal, doesn't conflict).
- **React.memo on all list-rendered components:** CaseCard, AttentionCard, PulseMetricCard.
- **useMemo on all computed data:** case counts per specialty, pulse metrics, attention items merge+sort, filtered cases.
- **No LayoutAnimation without `configureNext` before state update.** Always call `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` before `setState`.
- **FAB uses `useBottomTabBarHeight()`** for bottom offset. Falls back to 90px if hook unavailable.
- **Filter bar sticky border:** 1px bottom border appears ONLY in sticky mode (detect via scroll offset), not in default position.
- **Card dividers in Zone 3:** 1px `theme.border`, inset 80px from left (past thumbnail). NOT full-width.
- **Attention carousel peek:** Card width = `screenWidth - 48px` to show ~16px peek of next card.
- **No shadows in dark mode.** AttentionCard shadow only renders in light mode. Dark mode uses elevation through background lightening.

#### Never do (dashboard-specific)

- Never add a greeting header ("Good morning, ..."). The header is the centered Opus lockup only.
- Never show charts, graphs, or sparkline charts (other than the 7-dot sparkline) on the dashboard surface. The pulse metric sparkline is 7 circles, not a line chart.
- Never show a "Needs Attention" section header when there are 0 items. The entire zone must be `null`.
- Never use a vertical FlatList for the recent cases inside the ScrollView (VirtualizedList nesting warning).
- Never reorder filter chips on selection. Order is static: All, then specialties per `categories.ts`.
- Never put the FAB inside the ScrollView. It is absolutely positioned outside, overlaying scroll content.
- Never add tutorial cards, onboarding hints, or "tip of the day" to the dashboard.
- Never use `headerTransparent: true` on the dashboard screen. Solid `theme.backgroundRoot`, consistent with `useScreenOptions()`.
- Never add notification badges or red dot indicators anywhere on the dashboard.
- Never duplicate inpatient display — the old Current Inpatients section is REPLACED by Zone 1, not supplemented.

#### Quick actions on cards

Both AttentionCard and CaseCard expose quick action buttons:

- **Histology** — amber chip with file-text icon, shown for skin cancer cases (`caseCanAddHistology`). Navigates to `AddHistologyScreen`.
- **+ Event** — secondary chip, navigates to `AddTimelineEventScreen` for the case.
- **Discharge** — amber chip on inpatient cards, opens discharge modal with date picker.
- **Next Episode / Log Case** — amber filled button on episode or episode-linked items, using episode-prefill when `episodeId` exists and `quickPrefill` for non-episode inpatients.

#### Needs Attention sources

Three item types merged by `useAttentionItems` / `dashboardSelectors`:

1. **Inpatients** — cases with `stayType === "inpatient"` and no `dischargeDate`, sorted by post-op day descending
2. **Active infections** — cases with `infectionOverlay?.status === "active"` (deduplicated against inpatients)
3. **Active episodes** — episodes with `status === "active"`, `"on_hold"`, or `"planned"`, with linked case data

Inbox photos are accessed via the header icon with badge count showing unassigned-only count via `getUnassignedInboxCount()` (not in the attention carousel).

"View all" button is shown whenever Zone 1 exists and navigates to `NeedsAttentionListScreen` — full-screen SectionList grouped by type with search and specialty-context handoff from the dashboard.

#### Practice Pulse metrics

Three metrics via `usePracticePulse`:

1. **This Month** — month-to-date case count with delta vs the same day span last month
2. **This Week** — 7-dot sparkline (Mon–Sun) showing cases per day
3. **Completion** — percentage of last 90 days cases with documented outcome

#### Specialty filter effects

When a specialty is selected (non-null), ALL zones filter simultaneously:

- Zone 1: only inpatients/episodes/infections matching that specialty
- Zone 2: all three metrics recalculate for that specialty
- Zone 3: only cases matching that specialty; section header becomes "{Specialty} Cases"
- FAB: pre-selects that specialty in the new case form

When "All" is selected (null), all zones show unfiltered aggregate data.

Specialty counts come from the canonical `getCaseSpecialties()` helper and the `All` chip uses raw case count rather than summing specialty buckets, so multi-specialty cases no longer inflate totals.

### App lock

PIN and biometric unlock via `AppLockContext`. Setup in `SetupAppLockScreen`, unlock in `LockScreen`. PIN hashed in `appLockStorage.ts`, biometric detection in `biometrics.ts`. Auto-lock timeout management. When biometrics are enabled, `LockScreen` auto-triggers Face ID / Touch ID each time the app resumes into a locked state, while keeping PIN/manual biometric fallback after cancel.

### Favourites & recents

`useFavouritesRecents` hook (227 lines) tracks recent/favourite diagnosis-procedure pairs in AsyncStorage. `FavouritesRecentsChips` shown in `DiagnosisPicker` (filtered by clinicalGroup for trauma/non-trauma) and `ProcedureSubcategoryPicker`. Recording on case save in `CaseFormScreen`. Hand trauma naturally excluded (generated procedures lack `picklistEntryId`).

### Staging configurations

17 systems: Tubiana, Gustilo-Anderson, Breslow, CTS Severity, Quinnell, TNM, NPUAP, Burns Depth/TBSA, Baker Classification, Hurley Stage, ISL Stage, House-Brackmann Grade, Wagner Grade, Le Fort Classification, Tubiana-Dupuytren (elective hand), CTS-Severity (elective hand), Quinnell-Trigger (elective hand).

### Data export

CSV (`exportCsv.ts`, 55+ columns with primary dx/proc dedicated columns, semicolon-delimited secondary, 6 hand infection columns, 6 implant columns, 5 patient identity columns, Dupuytren + breast columns), FHIR R4 (`exportFhir.ts`, full Bundle with Patient, Condition, Procedure, Encounter, Device resources), and PDF (`exportPdf.ts`, HTML-to-PDF via expo-print with implant column + patient name/DOB header, shared via expo-sharing). Export orchestration in `export.ts`. Configurable via `PersonalisationScreen`.

### Flap outcomes

Free flap outcomes are stored locally inside procedure `clinicalDetails`, alongside the rest of the canonical case record.

### Inline validation

Per-field validate-on-blur with errors displayed below fields. Required fields: patientIdentifier, procedureDate, facility. `validateField()` and `validateRequiredFields()` in `useCaseForm.ts`. `CaseSummaryView` gates save with validation.

### Keyboard optimisation

`react-native-keyboard-controller` with `KeyboardToolbar` for navigation between fields. `KeyboardAwareScrollViewCompat` wrapper for cross-platform compatibility. Configurable via `PersonalisationScreen`.

### Duplicate case

`buildDuplicateState()` in `useCaseForm.ts` deep-clones case data for quick re-entry. Available from action menu in `CaseDetailScreen`.

### Date handling invariants

- **Date-only picker values are canonical `YYYY-MM-DD`.** Produce them with `toIsoDateValue()` and normalize legacy persisted values with `normalizeDateOnlyValue()` / `parseDateOnlyValue()` from `client/lib/dateValues.ts`.
- **Do not build picker bounds from raw strings.** Never use patterns like `new Date(value + "T00:00:00")` or rely on `toISOString().split("T")[0]` for date-only fields; invalid `Date` objects passed to `DatePickerField` / native pickers can surface as epoch/1970 lockups.
- **Timestamp fields stay timestamps.** Fields such as `createdAt`, `updatedAt`, timeline/media timestamps, and flap `assessedAt` remain ISO timestamps and should only be converted to date-only at the UI boundary when feeding a date picker.

### Statistics tab (COMPLETE)

Dedicated bottom tab with 3-tier analytics. Middle tab between Dashboard and Settings, icon `bar-chart-2`.

#### Architecture

- **Screen:** `StatisticsScreen.tsx` — single scrollable screen with collapsible specialty sections
- **Hook:** `useStatistics.ts` — loads all cases via `useFocusEffect`, computes all metrics via `useMemo`. Returns career overview, monthly volume, base stats, dedicated `freeFlapStats`, per-specialty stats, operational insights, milestones, entry time stats, and specialty-specific insights (skin cancer, burns, hand case types)
- **Helpers:** `statisticsHelpers.ts` (454 lines) — pure compute functions: `computeCareerOverview`, `computeMonthlyVolume`, `computeOperationalInsights`, `computeMilestones`, `computeSkinCancerInsights`, `computeBurnsInsights`, `computeHandCaseTypeInsights`
- **Base stats:** `statistics.ts` — `calculateBaseStatistics`, `calculateFreeFlapStatistics`, `calculateStatistics` (per-specialty dispatcher), `calculateEntryTimeStats`, `calculateTopDiagnosisProcedurePairs`, shared filter helpers

#### Statistics invariants

- **Date-only case values must use `parseIsoDateValue()`.** Statistics code should never parse `YYYY-MM-DD` with `new Date(...)`; use `client/lib/dateValues.ts` so month buckets, milestone dates, and rolling filters stay timezone-safe.
- **Specialty card inclusion is case-level, but specialty metrics are diagnosis-group scoped.** A mixed case can appear in multiple specialty cards via `getCaseSpecialties(c)`, but each card must derive its internal metrics only from diagnosis groups/procedures matching that specialty.
- **Free flap analytics are a dedicated aggregate, not a specialty proxy.** `freeFlapStats` comes from `calculateFreeFlapStatistics(cases)` and only includes cases with analytics-bearing free flap data: tagged free-flap procedures with flap details, or legacy case-level `clinicalDetails.flapType`.

#### 3-tier content

**Tier 1 — Career Overview:** Total cases, active months, cases/month rate, specialties used. `StatCard` grid with hero metric (total cases or specialty-specific metric).

**Tier 2 — Specialty Deep-Dives:** Dedicated free-flap card first when `freeFlapStats` exists, then `SpecialtyDeepDiveCard` per specialty used, collapsible with animated `LayoutAnimation`. Each shows specialty-specific content:

- **Hand surgery:** Trauma/acute/elective split, nerve + tendon repair counts, top procedures as `HorizontalBarChart`
- **Skin cancer:** Pathology category distribution (BCC/SCC/melanoma/etc) as `HorizontalBarChart`, histology completion rate
- **Burns:** Acute/reconstruction split, grafting rate
- **Orthoplastic/Breast/Body contouring:** Specialty-specific stats from `calculateStatistics`
- **Other specialties:** Base statistics (complication rate, facility breakdown)

**Tier 3 — Operational Insights:** Monthly volume `BarChart` (animated SVG bars, short labels for >6 bars), avg case duration, data completeness %, complication rate, "Your Top 10" procedure list, `MilestoneTimeline` (ordinal labels, 5 visible before "See all").

#### Chart components (`client/components/statistics/`)

| Component               | Purpose                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `BarChart`              | Animated SVG vertical bar chart (react-native-reanimated). Plays animation once only (useRef guard). Short labels for >6 bars. |
| `HorizontalBarChart`    | View-based horizontal bars with labels, values, and overflow count. `ellipsizeMode="tail"` on labels.                          |
| `StatCard`              | Themed metric card with label, value, optional subtitle.                                                                       |
| `MilestoneTimeline`     | Vertical timeline with dots, lines, ordinal labels, date formatting with crash guard. Default 8 visible with "See all" expand. |
| `SpecialtyDeepDiveCard` | Collapsible card per specialty with chevron toggle and specialty colour accent.                                                |
| `EmptyStatistics`       | Zero-case empty state with illustration and prompt.                                                                            |

#### Data flow

`useStatistics` → loads cases once per focus → fans out to 10+ `useMemo` computations → `StatisticsScreen` renders. `computeOperationalInsights` accepts precomputed `baseStats` to avoid redundant computation. Specialty filtering uses canonical `getCaseSpecialties()` helper.

### Data migration

`migrateCase()` in `client/lib/migration.ts` — lazy migration on load, schemaVersion 4, idempotent. Handles old flat diagnosis/procedure fields → multi-group architecture. Validation via `migrationValidator.ts`.

## Skin cancer workflow — process design guidelines

These guidelines govern all skin cancer workflow implementation. They apply to any component, type, or logic touching skin cancer case entry, multi-lesion sessions, histology tracking, or cancer pathway episodes. Violating these principles requires explicit approval from Mateusz.

### Core architectural rule: diagnosis-driven, not specialty-gated

The skin cancer module activates based on diagnosis metadata, never on specialty selection. A case filed under general, head_neck, or any other specialty must get the same skin cancer workflow when a skin cancer diagnosis is selected. This is fundamentally different from hand trauma (which gates on specialty = hand_wrist + caseType = trauma).

- **Activation trigger:** Any `DiagnosisPicklistEntry` with `hasEnhancedHistology: true` OR from the skin cancer diagnosis family (BCC, SCC, melanoma, benign neoplasm excision, skin lesion NOS).
- **Never gate on specialty.** A multi-lesion session with a nose BCC and a forearm SCC must work without the surgeon choosing between head_neck and general.
- **Never duplicate the module per specialty.** One `SkinCancerAssessment` component, one set of types, one activation path.

### Three entry points (pathway stage gate)

Every skin cancer lesion begins with a single mandatory question: "What stage are you at with this lesion?" Three options:

1. **Excision biopsy (`excision_biopsy`)** — No prior histology. Surgeon is performing first excision. Form shows: clinical suspicion, site, dimensions, procedure, reconstruction. Histology section collapsed as "Pending."
2. **Histology known (`definitive_excision`)** — Confirmed diagnosis exists from prior biopsy. Form leads with histology entry (type, subtype, Breslow/risk features, prior margins). Procedure auto-suggested from pathology. SLNB section conditionally visible for melanoma.
3. **Continuing care (`continuing_care`)** — Another surgeon started. Form captures context (what was done before, indication for current intervention), then current procedure. Lightest data entry for "prior" fields — structured but marked as "reported."

This gate appears per-lesion in multi-lesion sessions, not per-case. Lesion 1 can be `excision_biopsy` while Lesion 2 is `definitive_excision`.

### UX pattern: sectioned form, not wizard

Skin cancer entry uses a sectioned form with responsive disclosure. This is NOT a linear wizard.

- All sections visible as collapsed headers — surgeon sees full scope at a glance.
- Sections expand/collapse independently — non-linear access for expert users.
- Sections auto-expand when prior selections make them relevant (e.g., selecting melanoma expands SLNB section).
- Each section is self-contained — no cross-section dependencies that prevent partial completion.
- Completion indicator per section: filled (green check), pending (amber), not started (grey).
- Never force linear progression. Surgeons must be able to fill histology before procedure, or procedure before site, or any other order.
- Never use a stepper/progress bar implying sequential steps. Use section completion badges instead.

### Per-lesion independence

In multi-lesion sessions, each `LesionInstance` is an independent clinical entity:

- Each lesion has its own `SkinCancerLesionAssessment` with its own `pathwayStage`.
- Each lesion has its own histology, margins, reconstruction, and pathway badge.
- Lesions can span any body region — the site picker is body-wide, not constrained by specialty.
- Per-lesion pathway badges show at-a-glance status: "Awaiting histo" (amber), "Margins clear" (green), "Incomplete margins" (red), "Histology known" (blue).
- Never share pathway state across lesions. Each lesion's cancer pathway is independent.

### Histology lifecycle as first-class concept

"Awaiting histology" is a status with active tracking, not an empty field.

- Saving a case with any lesion at `excision_biopsy` stage auto-creates a `cancer_pathway` episode with `pendingAction: awaiting_histology`.
- Dashboard episode cards show days since operation (clinical urgency signal for histology turnaround).
- Episode cards have a "+ Update histology" quick action that deep-links to the histology section of the specific lesion.
- When histology is entered and margins are incomplete, the system prompts: "Re-excision needed?" and offers to pre-fill the next encounter (carry forward patient, site, prior histology).
- Episode auto-resolves when all lesions have clear margins and no further action pending.
- Never treat histology as optional. For `excision_biopsy` pathway, histology is always "pending" until explicitly entered. The case is never "complete" without it.

### Progressive disclosure rules for skin cancer fields

Type-specific fields appear only when the relevant pathology type is selected:

- **BCC selected** → show subtype picker (nodular, superficial, infiltrative, morphoeic, micronodular, mixed). No Breslow, no SLNB.
- **SCC selected** → show differentiation, depth, PNI, LVI, risk level. No Breslow, no SLNB (unless high-risk, then SLNB may appear).
- **Melanoma selected** → show full melanoma panel: Breslow (0.1mm precision), ulceration, mitotic rate, subtype, microsatellites, LVI, neurotropism, regression, TILs, Clark level. Show SLNB section if Breslow >0.8mm.
- **Benign / Uncertain** → minimal fields: site, dimensions, procedure, reconstruction only.
- Never show melanoma-specific fields for BCC/SCC. Never show BCC subtypes for melanoma. The disclosure must be clean — no irrelevant fields visible.

### Margin recommendation engine (clinical decision support)

When pathology type and staging are entered, display a read-only reference badge showing guideline-recommended margins:

| Diagnosis           | Recommended margin |
| ------------------- | ------------------ |
| Melanoma in situ    | 5mm (NCCN/ESMO)    |
| Melanoma ≤1.0mm     | 1cm                |
| Melanoma 1.01–2.0mm | 1–2cm              |
| Melanoma >2.0mm     | 2cm                |
| BCC                 | 3–4mm (or Mohs)    |
| SCC low-risk        | 4–6mm              |
| SCC high-risk       | 6–10mm             |

The badge is informational only. The surgeon enters their actual margin taken in a separate editable field. Never auto-fill the "margin taken" field from guidelines. The recommendation and the actual margin are separate data points for audit.

### Return-to-update pattern

Surgeons return days/weeks later to update histology. This must be the smoothest possible path:

- From dashboard episode card → one tap → opens case → scrolls/navigates directly to histology section of the specific lesion.
- Section-level editability: each section has an "Edit" affordance. All other sections remain read-only showing previously entered data.
- Never require re-entry of unchanged fields when updating. Only the target section opens for editing.
- Never require navigating through the full case form to reach histology. The deep-link must bypass irrelevant sections.

### SLNB section visibility rules

The SLNB section is conditionally visible, never always-on:

- **Show when:** melanoma with Breslow >0.8mm, OR melanoma with ulceration at any thickness, OR surgeon manually toggles it on.
- **Fields:** Offered (yes/no) → If yes: site(s) multi-select, performed (yes/no), nodes retrieved (number), result (pending/negative/positive with sub-classification).
- Never show SLNB for BCC. Only show for SCC if the surgeon manually activates it (rare, high-risk cases).

### Data model rules

- `SkinCancerLesionAssessment` attaches to `LesionInstance` (multi-lesion) or `DiagnosisGroup` (single-lesion). It extends existing infrastructure — never replaces it.
- All new types live in `client/types/skinCancer.ts` (extending existing file).
- Histology from a prior procedure (`priorHistology`) and histology from the current specimen (`currentHistology`) are separate fields. Never merge them.
- `HistologySource` distinguishes: `own_biopsy`, `external_biopsy`, `current_procedure`.
- Backward compatibility required: cases without `skinCancerAssessment` fields must load without errors. Use optional fields throughout.
- No SQL migration for skin cancer fields. All skin cancer assessment data lives in the case JSON (local storage), same as hand trauma, flap details, wound assessments. Server schema unchanged.

### Anti-patterns — never do these

- Never force specialty selection before skin cancer workflow activates. The workflow is diagnosis-driven.
- Never implement skin cancer as a linear wizard with enforced step ordering. Use sectioned form with responsive disclosure.
- Never share histology state between lesions in a multi-lesion session. Each lesion is independent.
- Never auto-fill "margin taken" from guideline recommendations. Keep recommendation and actual as separate fields.
- Never show the full melanoma field set for BCC/SCC or vice versa. Progressive disclosure must be type-specific.
- Never make histology entry mandatory at case creation time. For `excision_biopsy` pathway, histology is expected later — the case saves with histology "pending."
- Never create separate components per pathology type (no `BCCAssessment`, `SCCAssessment`, `MelanomaAssessment`). One `SkinCancerAssessment` component with internal conditional rendering based on pathology type.
- Never duplicate the anatomical site picker per specialty. One body-wide site picker shared across all lesions regardless of specialty context.
- Never put skin cancer logic in specialty-specific config files. The skin cancer module is cross-specialty by design. Config and activation logic belong in skin-cancer-specific files.

### Component & file location conventions

Following established patterns:

| Purpose              | File                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Assessment component | `client/components/skin-cancer/SkinCancerAssessment.tsx` (analogous to `hand-trauma/HandTraumaAssessment.tsx`)          |
| Type definitions     | `client/types/skinCancer.ts` (extend existing)                                                                          |
| Mapping/config       | `client/lib/skinCancerConfig.ts` (margin recommendations, SLNB criteria, disclosure rules)                              |
| Integration point    | `DiagnosisGroupEditor.tsx` activates the module when diagnosis metadata matches                                         |
| Tests                | `client/lib/__tests__/skinCancerAssessment.test.ts` for disclosure logic, margin recommendations, episode auto-creation |

## Breast Module — Locked Decisions

### Architecture
- Soft clinical context per side (reconstructive/aesthetic/gender_affirming), NOT a hard gate
- Per-side independence: left and right are fully independent data capture units
- Modules activate on procedure type, not clinical context
- BreastAssessment renders INLINE in DiagnosisGroupEditor (like HandTraumaAssessment)
- Implant/Flap/Lipofilling cards render as collapsible sections WITHIN BreastAssessment

### Anti-Patterns — DO NOT
- DO NOT create a BreastLaterality gate that restricts procedure selection
- DO NOT duplicate FreeFlapDetails fields — BreastFlapDetailsData extends, not replaces
- DO NOT create a separate ReconstructionTiming type — reuse existing from free flap spec
- DO NOT put implant details in a modal sheet — it's a collapsible inline section
- DO NOT duplicate brand components — import from client/components/brand/
- DO NOT create separate left/right procedure entries — procedures are per-case, breast assessment per-side
- DO NOT make breastReconstructionMeta a required field on TreatmentEpisode — it's nullable JSONB
- DO NOT add new episode types — use existing staged_reconstruction

### Component Registry
- Config: `client/lib/breastConfig.ts`
- Types: `client/types/breast.ts`
- Components: `client/components/breast/` (created in Phase 2+), `client/components/CompactProcedureList.tsx` (shared, used by breast + H&N)

### Data Flow
- Implant details: BreastSideAssessment.implantDetails (per-side)
- Flap details: BreastSideAssessment.flapDetails (per-side, breast extension only)
- Generic flap fields: CaseProcedure.freeFlapDetails (existing, unchanged)
- Lipofilling: BreastSideAssessment.lipofilling (per-side)
- Liposuction: case-level (shared across sides)
- Episode meta: TreatmentEpisode.breastReconstructionMeta (nullable JSONB)

## Breast Module — Additional Locked Decisions (March 2026)

### Episode Unification
- Breast cases use the breast-specific episode prompt ONLY — generic "Start treatment episode?" toggle is HIDDEN for breast specialty
- Breast episodes are `TreatmentEpisode` with `breastReconstructionMeta` — no separate entity
- Episode prompt appears ONCE per case (below both side cards for bilateral, inside side card for unilateral)

### Diagnosis Picker
- SNOMED CT codes are NEVER shown to the surgeon in the diagnosis picker
- Diagnoses render as chips, not list rows
- SNOMED search is collapsed by default behind "Can't find your diagnosis?" link

### Cross-Context Visibility
- Implant complication diagnoses have `crossContextVisible: true` and appear under both Reconstructive and Aesthetic contexts
- Gender-affirming context still only shows gender-affirming diagnoses

## Design system: Charcoal + Amber

All tokens in `client/constants/theme.ts` (single source of truth, 273 lines).

### Colour palette

**Backgrounds (dark):** #0C0F14 (root), #161B22 (surface), #1C2128 (raised), #2D333B (border)
**Backgrounds (light):** #FFFFFF (root/elevated), #F6F8FA (surface), #ECEEF1 (raised), #D0D7DE (border)
**Text (dark):** #E6EDF3 (primary), #8B949E (secondary), #656D76 (tertiary)
**Text (light):** #1F2328 (primary), #656D76 (secondary), #8B949E (tertiary)
**Accent:** #E5A00D dark, #B47E00 light — interactive elements ONLY
**Semantic:** success #2EA043/#1A7F37, warning #D29922/#9A6700, error #F85149/#CF222E, info #58A6FF/#0969DA
**buttonText:** #0C0F14 dark (dark on amber), #FFFFFF light (white on amber)

### Role colours

Dark: primary=#E5A00D, supervising=#D8B4FE, assistant=#86EFAC, trainee=#7DD3FC
Light: primary=#B47E00, supervising=#8250DF, assistant=#1A7F37, trainee=#0969DA

### Specialty colours

Per-specialty in `theme.specialty[key]`. Pastel on dark, deeper on light. Rendered via `SpecialtyBadge` (text) and `SpecialtyIcon` (SVG from `client/assets/specialty-icons.ts`).

### Typography

display: 28/36/700, h1: 22/30/700, h2: 18/26/600, h3: 16/24/600, h4: 15/22/600, body: 16/24/400, small: 14/20/400, footnote: 13/18/400, caption: 12/16/400, mono: 14/20/500 (SF Mono iOS / monospace Android), label: 12/16/500 uppercase 0.5 letter-spacing

### Layout tokens

Border radius: xs 6, sm 10 (inputs/buttons), md 14 (cards), lg 20, xl 28, full 9999
Touch targets: minimum 48px (`Spacing.touchTarget`)

### Design rules

- Amber accent on interactive elements only. Never on static text.
- Never #000000 background — use charcoal.950 (#0C0F14)
- Never #FFFFFF text in dark mode — use #E6EDF3
- Font weight for emphasis, NOT colour variation
- Numbers in SF Pro Mono in data-dense views
- All cards: `Shadows.card` + `BorderRadius.md` (14px) + `theme.backgroundElevated`
- No hardcoded hex values — always `theme.*` or `palette.*`
- Headers: solid `theme.backgroundRoot`, no blur/transparency, no shadow. Never `headerTransparent: true` or `useHeaderHeight()`.
- Horizontal pill bars (SectionNavBar, dashboard filters): no container borders, pills float on `backgroundRoot`
- Card accent borders: primary group = `theme.link` full opacity; groups 2+ = 60%/35% opacity

## Security & encryption

### Authentication

- bcrypt 10 rounds, minimum 8-character passwords
- JWT with `tokenVersion` — password change revokes all tokens
- Rate limiting on auth endpoints
- Password reset: 1-hour expiry tokens, single-use, hashed in DB
- Email never leaked on reset (always returns success)
- Profile updates restricted to prevent mass assignment

### Encryption

- **XChaCha20-Poly1305 AEAD** for all local case data
- Envelope format: `enc:v1:nonce:ciphertext`
- Key derivation from user passphrase via scrypt
- Legacy XOR data auto re-encrypted on load

### E2EE scaffolding

- Per-device X25519 key pairs stored securely
- Public keys registered with server, revocable
- Case key wrapping infrastructure in place

### Encrypted media (v2 — file-based AES-256-GCM)

**Architecture:** Per-image DEK model with file-system storage. Each photo gets a random 256-bit DEK, encrypted via AES-256-GCM (`@noble/ciphers`). The DEK is wrapped with the master key (AES-256-GCM) and stored in plaintext `meta.json`. Cipher provider remains isolated in `mediaEncryption.ts` for a future native file-crypto swap if profiling warrants it. `mediaStorage.ts` canonicalizes legacy `encrypted-media:{uuid}` references to `opus-media:{uuid}` when valid v2 backing exists.

**Storage layout:**

```
{Paths.document}/opus-media/{uuid}/
  image.enc    — AES-256-GCM encrypted full image (nonce||ciphertext||tag)
  thumb.enc    — AES-256-GCM encrypted 300px JPEG thumbnail
  meta.json    — { version:2, mediaId, wrappedDEK (hex), mimeType, width, height, hasThumb, createdAt }
```

**URI scheme:** `opus-media:{uuid}` (v2) — routed by `mediaStorage.ts`. Legacy `encrypted-media:{uuid}` (v1) still supported with lazy migration on access.

**Display pipeline:** `EncryptedImage` → v2 branch uses `useDecryptedImage` hook → decrypts to temp file in `Paths.cache` → renders via `expo-image` with `file:///` URI. LRU temp-file cache: 80 thumbnails (~2MB), 10 full images (~50MB). Max 2 concurrent decryptions.

**Security lifecycle:**

- DEK zeroed after use (`dek.fill(0)`)
- Decrypted temp files cleared on startup, logout, delete, and every app background transition (regardless of app lock config)
- Thumbnails encrypted (v1 stored unencrypted — v2 fixes this gap)
- Delete paths are idempotent across legacy AsyncStorage blobs and migrated v2 filesystem copies
- No plaintext on persistent storage — only in `Paths.cache` (OS-reclaimable)

**v1 → v2 migration:** Lazy on-access via `mediaMigration.ts`. When a v1 URI is loaded, transparently re-encrypts to v2 file format. V1 AsyncStorage blobs deferred for explicit cleanup via `cleanupMigratedV1Data()`. Concurrent migrations coalesced per-ID.

**Capture pipeline:** ImagePicker returns file URIs → `getImageBytesFromUri()` in `thumbnailGenerator.ts` re-encodes (inherently stripping EXIF) + extracts bytes → `generateThumbnailBytes()` creates 300px/0.6 thumbnail → `saveMediaV2()` encrypts both with per-image DEK → writes `image.enc` + `thumb.enc` + `meta.json`. Base64 is transient (decoded immediately, never stored). Single ImageManipulator pass — no double-encoding.

**Operational:**

- `MediaManagementScreen` stages edits locally, prompts Save/Discard on dirty exit, deletes removed media on save, and cleans up newly imported media on discard
- User-facing batch media cap standardised to 15 across case/discharge/media-management surfaces
- Cleanup on case/photo delete (v2 deletes directory, v1 deletes AsyncStorage keys)

### Server security

- Security headers: HSTS (1yr), CSP, X-Frame-Options DENY, strict Referrer-Policy
- Tiered body parsing limits (auth 1KB, avatar 5MB, default 256KB)
- Request logging: no bodies logged (privacy)
- 4xx messages exposed, 5xx details hidden
- IDOR prevention: composite ownership checks (id + userId) on all mutations
- Zod validation at API boundaries

## Deployment

### Railway (production API)

- **URL:** https://api-server-production-4dd7.up.railway.app
- **Services:** `api-server` (Express) + `Postgres` (PostgreSQL)
- **Deploy:** `railway up` from project root
- **Build:** Nixpacks, Node 20, `npm run server:build` → CJS bundle → `node server_dist/index.js`
- **Config:** `railway.toml`
- **Healthcheck:** `GET /api/health` (300s timeout)
- **Schema push:** Use public DATABASE_URL with `npx drizzle-kit push`

### iOS / App Store

- **Bundle ID:** `com.drgladysz.opus`
- **App Store name:** Opus Logbook
- **Home screen name:** Opus
- **App Store Connect ID:** 6759992788
- **SKU:** opus-surgical-logbook
- **Apple Developer Team:** 8CQ38RR2W4
- **Expo slug:** surgical-logbook
- **EAS Project ID:** 0bc1b91c-c240-4f4e-b030-31d16389cd1e
- **Expo account:** @gladmat
- **Version:** 2.5.0, buildNumber 5
- **New Architecture:** enabled
- **React Compiler:** enabled (experimental)

### Environment variables

| Variable         | Required | Notes                                              |
| ---------------- | -------- | -------------------------------------------------- |
| `DATABASE_URL`   | Yes      | PostgreSQL connection string                       |
| `JWT_SECRET`     | Yes      | Min 32 characters                                  |
| `PORT`           | Yes      | Use 5001 locally (5000 conflicts with AirPlay)     |
| `NODE_ENV`       | No       | development/production/test (default: development) |
| `RESEND_API_KEY` | No       | For email functionality                            |
| `APP_DOMAIN`     | No       | Override app domain for emails                     |
| `ENABLE_SEED`    | No       | Gate SNOMED seed endpoint (dev only)               |
| `SEED_TOKEN`     | No       | Token for seed endpoint                            |

### Email

- **Provider:** Resend
- **From:** noreply@drgladysz.com
- **Emails:** Password reset ("Reset Your Password — Opus"), Welcome ("Welcome to Opus")

## Path aliases

- `@/*` → `client/*`
- `@shared/*` → `shared/*`

Configured in both `tsconfig.json` and `babel.config.js` (module-resolver plugin).

## Conventions

- **Strict TypeScript** throughout — `strict: true`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- **React Navigation** for all routing (not Expo Router)
- **Direct fetch helpers** for server calls (no active React Query runtime layer)
- **Zod + drizzle-zod** for validation at API boundaries
- **React Native primitives** (View, Text, ScrollView) — no third-party UI kit
- **@noble/\*** for cryptographic operations (not Web Crypto)
- **No hardcoded colours** — always `theme.*` or `palette.*` from `client/constants/theme.ts`
- **Ownership verification** at every API level — IDOR-safe
- **Selector-based case form store** — field-level subscriptions with separate actions/validation contexts to minimize rerenders
- **Unconditional field setters** (`?? ""`) to ensure cleared fields persist
- **Header save ref pattern** — `handleSaveRef.current` always latest closure
- **Encrypted URIs** — `opus-media:{uuid}` (v2 file-based) and `encrypted-media:{uuid}` (v1 legacy) schemes for media references
- **Draft auto-save** — debounced + AppState background flush

## Operative role & supervision model

Three independent dimensions replacing the legacy single 7-value `Role` type (`PS|PP|AS|ONS|SS|SNS|A`):

1. **Operative Role** (`OperativeRole`): `SURGEON`, `FIRST_ASST`, `SECOND_ASST`, `OBSERVER`, `SUPERVISOR`
2. **Supervision Level** (`SupervisionLevel`): `INDEPENDENT`, `SUP_AVAILABLE`, `SUP_PRESENT`, `SUP_SCRUBBED`, `DIRECTED`, `NOT_APPLICABLE`
3. **Responsible Consultant** (`responsibleConsultantName`): case-level named field

### Architecture

- **Case-level defaults:** `defaultOperativeRole` and `defaultSupervisionLevel` on `Case` — all procedures inherit these
- **Per-procedure override:** `operativeRoleOverride` and `supervisionLevelOverride` on `CaseProcedure` — zero taps for the common case, "Override" link available when needed
- **Resolution chain:** `resolveOperativeRole(override?, default?)` → override > default > `"SURGEON"` fallback
- **Supervision auto-clear:** only applicable for `SURGEON` role via `supervisionApplicable()` — non-SURGEON roles auto-resolve to `NOT_APPLICABLE`
- **Smart defaults:** `suggestRoleDefaults(profile)` → consultants get `SURGEON + INDEPENDENT`, trainees get `SURGEON + SUP_SCRUBBED`
- **Legacy migration:** `migrateLegacyRole(legacyCode)` maps old 7 codes to `{ role, supervision }` pairs. Cases load transparently.
- **Backward compat:** `toNearestLegacyRole(role, supervision)` maps back to legacy code for export/sync. `teamMembers[0].role` still written on save.

### Key files

| File                                         | Purpose                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `client/types/operativeRole.ts`              | Types, labels, helpers, migration, 6 export format mappings (RACS MALT, JDocs, UK eLogbook, ACGME, German, Swiss) |
| `client/lib/roleDefaults.ts`                 | Smart defaults, `isConsultantLevel()`, `suggestRoleDefaults()`                                                    |
| `client/lib/__tests__/operativeRole.test.ts` | 68 tests covering migration, resolution, export mappings                                                          |

### Export-time format derivation

RACS MALT codes and other training-programme formats are derived at export time (never stored):

- `toRacsMaltPlastics(role, supervision)` → RACS MALT Plastics format
- `toRacsMaltJDocs(role, supervision)` → JDocs format
- `toUkElogbook(role, supervision)` → UK eLogbook code
- `toAcgmeGeneralSurgery(role, supervision)` → ACGME format
- `toGermanWeiterbildung(role, supervision)` → German Weiterbildung format
- `toSwissSiwf(role, supervision)` → Swiss SIWF format

### Operating team removal

The `OperatingTeamRole`, `OperatingTeamMember` types and operating team UI (add/remove team members in OperativeSection) have been removed. The `operatingTeam` field on `Case` is kept for backward compat (old case data) but is no longer collected or displayed. Team sharing will be handled by a separate feature.

## Testing

- **Framework:** Vitest 4.0.18, **838 tests** across 52 files
- **Client tests:** `client/lib/__tests__/` and `client/components/` — 44 test files covering hand trauma (diagnosis, mapping, ux), skin cancer (config 89, phase4 11, phase5 18, diagnoses 7), dashboard (selectors 7), hand (infection 42, elective 52), dupuytren (37), joint implant (44), media (encryption 7, fileStorage 3, migration 4, tagMigration 82, captureProtocols 41, operativeMedia 19, form 4, defaults 4, context 3), inbox (storage 13, assignment 17), capture (smartImportPrefs 10, sharedIngress 2), case (specialty 5, storageCache 4, specialtyRepair 2, draftPersistence 1), statistics (helpers 3, stats 7), dates (values 12, normalization 4), export (implant 3, breast), planned case (18), media organiser (15), NHI validation (12), patient identity (11), operative role (68), head & neck integration (4), breast (phase3, phase4, export), FISS calculator (12), plus media UI coverage
- **Server tests:** `server/__tests__/` — auth (17), validation (7), diagnosisStagingConfig (3)
- **Run:** `npm run test` (once) or `npm run test:watch` (watch mode)

## Visual Verification (Expo MCP)

The Expo MCP server is connected. When the dev server is running with `EXPO_UNSTABLE_MCP_SERVER=1 npx expo start --dev-client` and the iOS Simulator has the app loaded, you have access to visual feedback tools.

### Available tools

| Tool | Use for |
| ---- | ------- |
| `automation_take_screenshot` | Capture full device screenshot — use after ANY UI change |
| `automation_find_view_by_testid` | Check if a specific element exists and get its properties |
| `automation_tap_by_testid` | Tap an interactive element by its testID |
| `automation_tap` | Tap at specific screen coordinates (fallback only) |
| `automation_take_screenshot_by_testid` | Screenshot a specific view by its testID |

**Fallback:** If expo-mcp tools fail, use `xcrun simctl io booted screenshot /tmp/screen.png` then read the file.

### When to verify

- Always after modifying any component that renders visible UI
- Always after changing styles, spacing, layout, or theme tokens
- Always after adding or reordering form fields
- Never after pure logic changes (hooks, lib functions, API calls) that don't touch render output

### Visual QA checklist

After taking a screenshot, check for:

1. **Spacing & alignment** — consistent with Spacing constants (4/8/12/16/20/24), no overlapping elements
2. **Colour consistency** — using theme tokens from `constants/theme.ts`, no hardcoded colours
3. **Touch targets** — all interactive elements ≥ 44pt height
4. **Text truncation** — long text uses `numberOfLines` + ellipsis, not overflow
5. **Dark mode** — all surfaces use `theme.backgroundRoot` / `theme.backgroundElevated` / `theme.backgroundSecondary`, never raw hex
6. **Safe areas** — content respects `useSafeAreaInsets()` at top and bottom
7. **Keyboard avoidance** — form inputs not obscured when keyboard is open
8. **Section nav bar** — all 5 pills (Patient, Case, Operative, Media, Outcomes) visible without horizontal scrolling
9. **Charcoal + Amber brand** — accent colour is `#E5A00D`, backgrounds are dark charcoal spectrum, no stray bright colours

### testID naming conventions

Prefix by element type, suffix with semantic name:

| Prefix | Pattern | Example |
|--------|---------|---------|
| `screen-` | `screen-{name}` | `screen-dashboard` |
| `section-` | `section-{name}` | `section-patient` |
| `tab-` | `tab-{name}` | `tab-dashboard` |
| `nav-pill-` | `nav-pill-{section}` | `nav-pill-case` |
| `btn-` | `btn-{action}` | `btn-save-case` |
| `input-` | `input-{field}` | `input-nhi` |
| `picker-` | `picker-{field}` | `picker-specialty` |
| `chip-` | `chip-{field}-{value}` | `chip-asa-2` |
| `card-` | `card-{type}-{id}` | `card-case-{id}` |
| `list-` | `list-{name}` | `list-recent-cases` |
| `sheet-` / `modal-` | `sheet-{name}` | `sheet-diagnosis-picker` |
