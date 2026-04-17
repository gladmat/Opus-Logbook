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
- **Phase 4 COMPLETE** — CSV/FHIR/PDF export, analytics dashboard
- **Elective Hand + Joint Implant COMPLETE** — 40 elective diagnoses, 8 subcategories (incl. Post-traumatic Bone with CorrectiveOsteotomyDetails inline card), 3 arthroplasty with implant tracking, 26 implant catalogue entries
- **Skin Cancer Terminology Repair COMPLETE** — corrected SNOMED codes, rare malignancy metadata, UK-extension procedure codes
- **Media Overhaul COMPLETE** — unified MediaTag taxonomy (64 tags, 7 groups), 7 capture protocols, EXIF stripping, 5 UI components
- **Capture Pipeline A–H COMPLETE** — Opus Inbox (encrypted MMKV), Smart Import, Opus Camera (quick snap + guided), planned cases, smart assignment, auto-organise, NHI auto-match, transactional reservation lifecycle, iOS native scaffold (widget + locked-camera + deep links)
- **Media Encryption Remediation COMPLETE** — temp cache sweeping, FlashList for large libraries
- **Case Category Repair COMPLETE** — edit-mode specialty preservation
- **Patient Identity COMPLETE** — structured name/DOB/NHI, per-user HMAC-SHA256, country-aware UI, CSV/FHIR/PDF export
- **Operative Role & Supervision COMPLETE** — 3-dimensional role model, 6 export format mappings
- **UX Polish COMPLETE** — FAB animation, compact PatientInfoSection, day-case auto-fill, 30-day RACS MALT audit, plan mode toggle
- **Head & Neck Progressive Disclosure COMPLETE** — CompactProcedureList (shared by breast + H&N), HeadNeckDiagnosisPicker (88 diagnoses, 9 subcategories)
- **Hand Elective UX + Dupuytren Module COMPLETE** — reconstruction pathway multi-select pending actions, elective hand laterality simplified to Left/Right only, trigger finger per-finger multi-select, Dupuytren's split into primary/recurrent/palm-only diagnoses with DupuytrenAssessment component (per-ray MCP/PIP measurement, auto-calculated Tubiana staging, first web space, diathesis features, previous treatment tracking), removed flat Tubiana staging config, CSV/FHIR export support, 37 tests
- **Team Sharing Phases 1–8 COMPLETE** — Career stage internationalisation (88 stages, 6 countries, 6-tier seniority), team contacts CRUD + Settings UI, case form Team section (chip-based operative team tagging, 6-pill SectionNavBar), sharing server infrastructure (E2EE, assessments, push), operativeTeam → share-on-save bridge, EPA derivation (seniority-chain algorithm, 14 tests), seniority-tier-based assessor role detection, background contact discovery (24h throttle), link confirmation + discovery badges, invitation emails (Resend, amber-branded), signup email matching, learning curve dashboard (dot plot charts, teaching aggregate, calibration score)
- **Facial & Peripheral Nerve Remediation Phases 1–2 COMPLETE** — Category renamed to "Facial & Peripheral Nerve", BP diagnoses collapsed (8→4: obstetric, traumatic, radiation, tumour), compression neuropathy subcategory (10 entries), facial nerve cross-referenced from H&N (9 entries), nerve tumour module (4 entries with nerveTumourModule flag), context-aware nerve picker (bodyRegion filtering), DIAGNOSIS_TO_NERVE auto-select (20 mappings), 4 rendering paths (BP-only, compression-lightweight, nerve-tumour-minimal, standard), laterality inside assessment (Left/Right only), BP aetiology-filtered mechanisms, neuroma affected nerve Section 0, legacy ID aliases for removed BP entries, 22 facial reanimation procedures cross-tagged peripheral_nerve, deriveInjuryPatternLabel for inferred BP pattern badge, 23 tests
- **Code Audit & Remediation COMPLETE** — Removed 7 unused npm packages, dead `teams`/`teamMembers` schema tables, 6 dead code files, 9 unused seed data exports; fixed patient identifier hashing inconsistency (inbox SHA-256 → HMAC-SHA256 consistent with case storage); deduplicated `ExcisionCompleteness`, disambiguated `LiposuctionArea`/`AmputationLevel` type name collisions; deleted ~45MB Replit session artifacts; deprecated `bodyContouringDiagnoses` stub removed
- **Per-Procedure Team Roles + EPA Targets COMPLETE** — `ProcedureTeamFooter` below each procedure card with per-procedure role overrides (`teamRoleOverrides`) and presence toggles (`teamMemberPresence`); EPA target derivation on save via `saveEpaTargets()` (non-blocking); `CaseDetailScreen` shows abbreviated names and resolved role labels per procedure; case-form UX polish (gender picker spacing, collapsible section layout measurement, elective-case injury date suppression)
- **Build Health COMPLETE** — All 1452 tests across 75 files green; `tsc --noEmit` clean; Vitest RN resolution fixed via `react-native-web` alias + `react-dom` + global setup file stubbing `globalThis.expo` and `expo-secure-store`
- **Phase 5 SHIPPED TO TESTFLIGHT** — Version 2.5.0, EAS build 1.2.52 from commit `00a3c3a`, production profile with auto-submit, reached TestFlight 2026-04-17

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
  screens/                       # 31 screens + 9 onboarding sub-screens
  components/                    # 160+ files across 18 subdirectories
    case-form/                   # 6 sections (incl. TeamSection) + CollapsibleFormSection, SectionNavBar, CaseSummaryView
    dashboard/                   # 10 files — dashboard v2 (see Dashboard v2 section)
    statistics/                  # BarChart, HorizontalBarChart, StatCard, MilestoneTimeline, SpecialtyDeepDiveCard
    hand-trauma/                 # 15 files — unified hand trauma assessment
    hand-infection/              # HandInfectionCard — 4-layer progressive disclosure
    hand-elective/               # HandElectivePicker + CorrectiveOsteotomyDetails — chip-based elective hand diagnosis selector
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
  lib/                           # 80+ files — storage, encryption, export, normalization, selectors, sharing, etc.
    diagnosisPicklists/          # 12 specialty picklists + lazy-loaded index
    teamContactsApi.ts           # Team contacts + user device keys + invitations API helpers
    sharingApi.ts                # E2EE case sharing API helpers
    assessmentApi.ts             # Blinded assessment API helpers
    assessmentRoles.ts           # Seniority-tier-based assessor role detection
    assessmentStorage.ts         # Encrypted local assessment storage
    assessmentAnalytics.ts       # Learning curves, teaching aggregate, calibration score
    buildShareableBlob.ts        # Case → SharedCaseData extraction
    e2ee.ts                      # X25519 + XChaCha20-Poly1305 crypto
    epaDerivation.ts             # Seniority-chain EPA pair algorithm
    discoveryService.ts          # Background contact discovery (24h throttle)
    seniorityTier.ts             # 6-tier career seniority model
    __tests__/                   # 77 test files
  types/                         # case, media, inbox, episode, infection, skinCancer, breast, dupuytren, osteotomy,
                                 #   handInfection, wound, jointImplant, operativeRole, teamContacts, sharing, etc.
  constants/                     # theme.ts (design tokens), categories, hospitals, trainingProgrammes
  data/                          # AO codes, flap configs, implant catalogue, capture protocols, clinical data
  navigation/                    # RootStack → Auth/Onboarding/Main; Main = Dashboard + Statistics + Settings tabs
targets/
  _shared/                       # Shared Swift constants + CameraCaptureIntent
  opus-camera-control/           # Inbox widget + Control Center capture control
  opus-locked-camera/            # LockedCameraCapture extension scaffold
server/
  app.ts, routes.ts              # Express API (~55 endpoints), security headers, CORS, body parsing
  storage.ts                     # DatabaseStorage with ownership checks
  snomedApi.ts                   # Ontoserver FHIR integration
  email.ts                       # Resend email service
  diagnosisStagingConfig.ts      # Dynamic staging form definitions
  __tests__/                     # 3 test files (auth, validation, staging config)
shared/
  schema.ts                      # Drizzle ORM table definitions, 8 tables
migrations/                      # 7 SQL migration files
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
- **Form state:** `useCaseForm()` hook → `useReducer` with 19+ actions (`SET_FIELD`, `SET_FIELDS`, `RESET_FORM`, `LOAD_CASE`, `LOAD_DRAFT`, `BULK_UPDATE`, `ADD_TEAM_MEMBER`, `REMOVE_TEAM_MEMBER`, `TOGGLE_OPERATIVE_TEAM`, `SET_OPERATIVE_TEAM_ROLE`, `REMOVE_OPERATIVE_TEAM_MEMBER`, `CLEAR_OPERATIVE_TEAM`, `ADD_ANASTOMOSIS`, `UPDATE_ANASTOMOSIS`, `REMOVE_ANASTOMOSIS`, `ADD_DIAGNOSIS_GROUP`, `REMOVE_DIAGNOSIS_GROUP`, `UPDATE_DIAGNOSIS_GROUP`, `REORDER_DIAGNOSIS_GROUPS`, `UPDATE_CLINICAL_DETAIL`). `CaseFormContext` now exposes selector-based subscriptions plus separate actions/validation contexts so unchanged sections do not rerender on unrelated edits.
- **Server state:** Direct API helpers built on `getApiUrl()` + `fetch`.
- **Auth state:** `AuthContext` with JWT tokens, profile, facilities, device keys.
- **Patient privacy:** Identifiers HMAC-SHA256 hashed in local case index (per-user key in iOS Keychain). Patient identity fields (`patientFirstName`, `patientLastName`, `patientDateOfBirth`, `patientNhi`) stored on-device only, stripped before server sync via `stripPatientIdentityForSync()`.

### Multi-diagnosis group architecture

Each Case has `diagnosisGroups: DiagnosisGroup[]` instead of flat diagnosis/procedures fields. Each group bundles: specialty, diagnosis, staging, fractures, procedures, and optional `handInfectionDetails`. `procedureSuggestionSource` tracks origin: `"picklist"`, `"skinCancer"`, `"acuteHand"`, or `"manual"`. Enables multi-specialty cases (e.g., hand surgery + orthoplastic in one session). Helpers: `getAllProcedures(c)`, `getCaseSpecialties(c)`, `getPrimaryDiagnosisName(c)` in `client/types/case.ts`. Save-time normalization via `client/lib/caseNormalization.ts`.

### Case form sections (6-tab architecture)

`CaseFormScreen.tsx` delegates to 6 section components via `CaseFormContext`. All 6 pills are visible simultaneously on any iPhone (no horizontal scrolling):

1. `PatientInfoSection` (`patient`) — Patient identity (NHI/name/DOB for NZ, generic identifier for non-NZ), privacy indicator, procedure date, facility, demographics
2. `TeamSection` (`team`) — Chip-based operative team tagging from `team_contacts` filtered by facility. Contacts shown as toggleable chips with inline role picker (PS/FA/SS/US/SA). Depends on facility selection in Patient. "+" chip navigates to AddEditTeamContact for quick-add.
3. `CaseSection` (`case`) — Wraps `DiagnosisProcedureSection` (diagnosis groups, specialty-specific UI) + conditional `TreatmentContextSection` (flap cases only)
4. `OperativeSection` (`operative`) — 4 sub-groups: Admission & Timing (urgency, stay type, dates, surgery times), Role & Anaesthesia (role, anaesthetic), Surgical Factors (wound risk, prophylaxis), Patient Factors (ASA, smoking, BMI, comorbidities — collapsed by default)
5. `OperativeMediaSection` (`media`) — Operative photos with capture protocols
6. `OutcomesSection` (`outcomes`) — Discharge outcome, mortality classification, collapsible 30-day RACS MALT audit (unplanned readmission/ICU/return to theatre), MDM, infection documentation. Day-case auto-fills "Discharged home"

Plus: `CollapsibleFormSection` (card wrapper), `SectionNavBar` (fixed-width pill navigation, 6 pills), `CaseSummaryView` (read-only review gating save with validation).

Header uses a truncating centered title. Header right is compact: overflow icon for Clear/Revert + Save button. `CollapsibleFormSection` now measures closed content safely so default-collapsed sections like Treatment Context open reliably on first tap. SectionNavBar has no bottom border.

### Edit mode

- Restores `clinicalDetails`, `recipientSiteRegion`, `anastomoses` from existing case data
- Uses actual `clinicalDetails` state (not placeholder) in save payload
- Preserves the stored top-level specialty/category on edit; does not silently fall back to `general`
- Gates edit-mode save/render on successful existing-case load, with explicit loading/error states
- Draft loading skipped in edit mode (`isEditMode` guard)
- All field setters use `?? ""` / `?? defaultValue` (unconditional) so cleared fields persist
- `handleSaveRef.current` always points to latest `handleSave` closure

## Database schema (PostgreSQL, 12 tables)

Defined in `shared/schema.ts`. All PKs are UUIDs via `gen_random_uuid()`. Cascade deletes on user deletion.

Tables: `users` (auth + tokenVersion for JWT revocation), `profiles` (1:1 with JSONB professionalRegistrations + surgicalPreferences + phone + discoverable), `user_facilities`, `user_device_keys` (X25519 E2EE), `password_reset_tokens` (single-use, 1hr expiry), `snomed_ref`, `team_contacts` (per-user operative team roster, JSONB facilityIds, optional linkedUserId → users), `shared_cases` (E2EE case sharing with recipient role + verification status), `case_key_envelopes` (per-device wrapped case keys), `case_assessments` (blinded supervisor/trainee assessments), `assessment_key_envelopes` (released on mutual reveal), `push_tokens` (Expo push notification tokens).

Legacy `teams` and `teamMembers` tables removed in `20260326_drop_legacy_teams.sql` — replaced by `team_contacts`.

**Performance indexes** (`migrations/add_performance_indexes.sql`): indexes on high-frequency query paths. All `IF NOT EXISTS`.

## API endpoints (server/routes.ts)

~55 endpoints under `/api/`, JWT bearer auth via `authenticateToken` middleware. See `server/routes.ts` for full details.

**Groups:** Auth (rate-limited, 8 endpoints including signup/login/refresh/password-reset), Profile (CRUD + avatar), Facilities (CRUD with isPrimary auto-clear), Device Keys (E2EE key management), Team Contacts (CRUD + link/unlink + invitations, rate-limited), User Lookup (search by email/phone + batch discover + device keys by user ID), Sharing (create/inbox/outbox/verify/revoke/update blob), Assessments (submit + status + history with auto-reveal), Push Tokens (register/unregister), SNOMED CT (live search via Ontoserver + reference data for vessels/flaps/regions/coupling), Staging (14 configs), Health check.

**Non-obvious:** Auth rate-limited. Password reset always returns success (no email leak). Avatar upload capped at 5MB via Multer. `seed-snomed-ref` is dev-only (env-gated).

## Supported specialties

12 specialties defined in `client/types/case.ts`:

- Hand surgery (`hand_wrist`), Orthoplastic, Breast, Body contouring, Burns, Head & neck, Aesthetics, General
- Plus: Cleft/Craniofacial (`cleft_cranio`), Skin cancer, Lymphoedema, Peripheral nerve

Each has: dedicated diagnosis picklist, specialty colour, SVG icon, procedure subcategories.

## Key features

### Procedure picklists & SNOMED CT

825 procedures across all specialties in `client/lib/procedurePicklist.ts`. Each entry has SNOMED CT codes, specialty tags, subcategory. All specialties use the subcategory picker UI.

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

- 40 structured diagnoses across 8 subcategories: Dupuytren's Disease (3), Stenosing Tenosynovitis (2), Joint & Degenerative (9), Elective Tendon (7), Post-traumatic Bone (4), Rheumatoid Hand (5), Tumours & Other (6), Congenital (3)
- Chip-based subcategory picker with expandable diagnosis list per category
- 17 procedures including 3 arthroplasty procedures with `hasImplant: true` flag (CMC1, PIP, MCP arthroplasty) and 6 post-traumatic bone procedures
- 3 new staging configurations: Tubiana-Dupuytren (5 grades), CTS-Severity (3 levels), Quinnell-Trigger (5 grades)
- Staging auto-activates when diagnosis has `stagingSnomedCode` matching server config
- Integrates with `JointImplantSection` for arthroplasty procedures (see Joint Implant Tracking below)
- **Dupuytren sub-module:** `DupuytrenAssessment` (`client/components/dupuytren/`), types in `client/types/dupuytren.ts`, helpers in `client/lib/dupuytrenHelpers.ts`. Primary/recurrent/palm-only diagnoses with per-ray MCP/PIP measurement, auto-calculated Tubiana staging, first web space, diathesis features, previous treatment tracking.
- **Post-traumatic Bone sub-module:** `CorrectiveOsteotomyDetails` (`client/components/hand-elective/CorrectiveOsteotomyDetails.tsx`), types in `client/types/osteotomy.ts`. Procedure-driven inline card (activates for 3 osteotomy procedure IDs). 5 sections: bone, deformity (multi-select), technique, graft (with donor site), fixation. Contextual defaults on mount (radius procedure → distal_radius bone, ulna shortening → distal_ulna + oblique technique). Progressive disclosure: opening wedge → autograft default, closing wedge → no graft. CSV (6 columns), FHIR (extension on Procedure), PDF export. `getOsteotomySummary()` helper for compact display.
- Tests: `client/lib/__tests__/handElective.test.ts` (103 tests), `dupuytren.test.ts` (37 tests), `osteotomy.test.ts` (18 tests)

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
5. **SLNB** — auto-offered for melanoma >0.8mm or ulcerated and for Merkel cell; can also be manually considered for selected high-risk SCC / rare malignant patterns. Existing saved SLNB data keeps the section visible.
6. **Biopsy / Excision** — biopsy pathway shows biopsy method + conditional fields; histology-known pathway uses simplified current-procedure excision planning (`HistologySection` simplified mode) with compact excision + peripheral margin layout.
7. **Specimen histology** — full structured `currentHistology` editor used as the return-to-update flow for final pathology and margin status. In biopsy-path initial logging it stays hidden until the case is reopened or current histology already exists.
8. **MDT toggle** — simple `discussedAtMdt` flag for the histology-known pathway.
9. **Summary & Procedures** — interactive suggested procedures with only the primary procedure preselected by default, coding details, accept/edit mapping, and completion summary.

**Histology precedence rules:**

- `currentHistology` is the authoritative post-procedure record when present.
- Summaries, CDS, badges, and lesion captions use `getSkinCancerPrimaryHistology()` to prefer current definitive histology over prior context.
- `priorHistology` remains contextual history rather than the primary displayed result once current histology exists.

**Procedure suggestions** (`getSkinCancerProcedureSuggestions`): category + site aware. Head/neck vs body excision variants, coverage suggestions (FTSG, STSG, local flaps) across broader excision flows, site-specific reconstruction for lip/ear/eyelid, and SLNB procedure inclusion when performed.

**Diagnosis resolution** (`resolveSkinCancerDiagnosis`):\*\*

- biopsy-stage cases remain coded as generic "awaiting histology" until `currentHistology.pathologyCategory` is actually confirmed
- confirmed histology resolves to the correct picklist diagnosis where supported
- rare malignant subtypes without a dedicated picklist entry return explicit manual-review metadata instead of silently falling back to "awaiting histology"

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

**Unified MediaTag taxonomy** — a single `MediaTag` type (64 tags across 7 groups: temporal, imaging, flap_surgery, skin_cancer, aesthetic, hand_function, other). Defined in `client/types/media.ts` — single source of truth.

**Key types & exports:**

- `MediaTag` — union of 64 string literals, one per media item
- `MediaTagGroup` — 7 group identifiers for UI sectioning
- `MEDIA_TAG_REGISTRY` — complete metadata: label, group, sortOrder, captureHint per tag
- `MEDIA_TAG_GROUP_LABELS` — display names for group tabs
- `getTagsForGroup(group)` — sorted tags within a group
- `getRelevantGroups(specialty?, procedureTags?, hasSkinCancerAssessment?)` — context-aware group filtering. Always includes temporal/imaging/other; conditionally adds flap_surgery, skin_cancer, aesthetic, hand_function based on case context. Skin cancer groups are diagnosis-driven via `hasSkinCancerAssessment` flag (not specialty-gated).

**Tag helpers** (`client/lib/mediaTagHelpers.ts`):

- `resolveMediaTag(tag?)` — resolves tag to valid MediaTag, defaulting to "other"
- `suggestTemporalTag(procedureDate?)` — auto-suggests temporal MediaTag based on days since procedure (preop → intraop → postop_early → postop_mid → followup_3m/6m/12m → followup_late). Uses `parseDateOnlyValue()` for timezone-safe parsing.

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

CSV (`exportCsv.ts`, 55+ columns with primary dx/proc dedicated columns, semicolon-delimited secondary, 6 hand infection columns, 6 implant columns, 6 osteotomy columns, 5 patient identity columns, Dupuytren + breast columns), FHIR R4 (`exportFhir.ts`, full Bundle with Patient, Condition, Procedure, Encounter, Device resources), and PDF (`exportPdf.ts`, HTML-to-PDF via expo-print with implant column + patient name/DOB header, shared via expo-sharing). Export orchestration in `export.ts`. Configurable via `PersonalisationScreen`.

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
| Mapping/config       | `client/lib/skinCancerConfig.ts` (margin logic for procedure matching, SLNB criteria, disclosure rules)                  |
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

## Craniofacial & Cleft Module — Locked Decisions

### Architecture
- CraniofacialAssessment renders INLINE in DiagnosisGroupEditor (like HandTraumaAssessment)
- Specialty-gated: activates when `specialty === "cleft_cranio"` (unlike skin cancer which is diagnosis-driven)
- Conditional section visibility based on diagnosis subcategory
- Age-at-surgery auto-computed from DOB + surgery date, displayed in smart units
- LAHSHAL is a 6-position structured input, NOT a text field
- Named technique is a structured picker per procedure, NOT free text

### Anti-Patterns — DO NOT
- DO NOT create modal sheets for the assessment
- DO NOT create a new specialty value — use existing "cleft_cranio"
- DO NOT duplicate FreeFlapDetails fields
- DO NOT put LAHSHAL in the staging config — it's a structured input in CraniofacialAssessment
- DO NOT create separate TypeScript files per classification — all in craniofacial.ts
- DO NOT import from headNeckDiagnoses for cleft entries — they live in cleftCranioDiagnoses.ts

### Component Registry
- `CraniofacialAssessment` → `client/components/craniofacial/CraniofacialAssessment.tsx`
- `LAHSHALInput` → `client/components/craniofacial/LAHSHALInput.tsx`
- `CraniosynostosisDetails` → `client/components/craniofacial/CraniosynostosisDetails.tsx`
- `OMENSInput` → `client/components/craniofacial/OMENSInput.tsx`
- Config: `client/lib/craniofacialConfig.ts`
- Types: `client/types/craniofacial.ts`
- Diagnoses: `client/lib/diagnosisPicklists/cleftCranioDiagnoses.ts`
- Procedures: entries in `client/lib/procedurePicklist.ts`

### Data Flow
- CraniofacialAssessment data: DiagnosisGroup.craniofacialAssessment (optional field)
- Cleft classification: craniofacialAssessment.cleftClassification
- Operative details: craniofacialAssessment.operativeDetails (always present)
- Craniosynostosis: craniofacialAssessment.craniosynostosisDetails (conditional)
- OMENS+: craniofacialAssessment.omensClassification (conditional, CF01 only)

### SNOMED CT Audit (March 2026)
- 38 diagnoses: 34 International, 4 UK Extension → replaced with International parents
- 69 procedures: 48 International, 21 VERIFY codes fixed + 8 non-VERIFY corrections for wrong codes (360820005 "urethral stricture", 82371002 "proton beam", 239404006 "release IMF")
- 0 broken procedure suggestion cross-references (53 unique procedurePicklistIds validated)
- 5 autoFill recipient site mappings added (craniofacial microsomia, Treacher Collins, fibrous dysplasia, encephalocele, orbital hypertelorism → head_neck)
- 5 cross-reference validation tests added

## Aesthetics Module — Locked Decisions

### Architecture
- Body Contouring merged INTO Aesthetics — `body_contouring` category ID retired, resolves to `aesthetics`
- Intent modifier (cosmetic / post_bariatric_mwl / functional_reconstructive) on diagnosis, NOT procedure
- AestheticAssessment renders INLINE in DiagnosisGroupEditor (like HandTraumaAssessment, BreastAssessment)
- Product detail cards render as CollapsibleFormSections WITHIN AestheticAssessment
- Non-surgical and surgical procedures live in SAME taxonomy, differentiated by `interventionType`
- Each procedure in a combination session gets its OWN procedure entry (no combined codes)
- Product catalogue is STATIC data (bundled, not fetched from API)

### Anti-Patterns — DO NOT
- DO NOT create a separate category for body contouring — it's merged into aesthetics
- DO NOT create a hard gate between surgical and non-surgical — they're the same flow
- DO NOT put product selection in a modal — it's an inline hierarchical picker
- DO NOT duplicate the breast module's implant types — import from breast types
- DO NOT duplicate CollapsibleFormSection — import from client/components/CollapsibleFormSection
- DO NOT duplicate brand components — import from client/components/brand/
- DO NOT create free-text fields for product names — always use structured picklist
- DO NOT store product catalogue on server — it's client-side static data
- DO NOT create new episode types for aesthetics — use existing types

### Component Registry
- Config: `client/lib/aestheticsConfig.ts`
- Products: `client/lib/aestheticProducts.ts`
- Types: `client/types/aesthetics.ts`
- Components (`client/components/aesthetics/`): `AestheticAssessment`, `AestheticProcedureFirstFlow`, `ProductPicker`, `PostBariatricContext`, plus 9 inline detail cards (`NeurotoxinDetailsCard`, `FillerDetailsCard`, `BiostimulatorDetailsCard`, `PrpDetailsCard`, `ThreadLiftDetailsCard`, `EnergyDeviceDetailsCard`, `FatGraftingDetailsCard`, `LiposuctionDetailsCard`)

## Burns Module — Locked Decisions

### Architecture
- Assessment-first model for acute burns: single "Acute burn" diagnosis entry (`burns_dx_acute`), full assessment inline — mirrors HandTraumaAssessment pattern
- NO phase gate — phase is implicit from diagnosis ID (`burns_dx_acute` → acute, all others → reconstructive)
- `BurnPhase` reduced to 2 values: `"acute" | "reconstructive"` (removed `"non_operative"`)
- `phase` removed from `BurnsAssessmentData` — derived via `getBurnPhaseFromDiagnosis(diagnosisId)` at render/export time
- `deriveBurnDiagnosis()` maps injury event mechanism/detail → specific SNOMED CT code (thermal 314534006, scald 423858006, contact 385516009, chemical 426284001, electrical 405571006, cold 370977006, radiation 10821000132101, inhalation secondary 75478009)
- `getAssessmentDrivenProcedureSuggestions()` replaces `conditionStagingMatch` — depth/TBSA/circumferential/inhalation/mechanism-conditional procedure suggestions
- BurnsAssessment renders INLINE in DiagnosisGroupEditor (like HandTraumaAssessment) — always shows full acute assessment (TBSA, Injury Event, Severity Badges, procedure-specific sections)
- TBSA uses three-tier progressive disclosure (Quick → Regional → Lund-Browder)
- Burn-specific procedure details stored as burnProcedureDetails on CaseProcedure
- Injury event data stored once on episode, not repeated per operation
- Severity scores (Revised Baux, ABSI) are auto-calculated badges, never manual entry
- Module visibility narrowed: BurnsAssessment only activates for `burns_dx_acute` (not all burns specialty diagnoses)
- DiagnosisClinicalFields (laterality) hidden for burns via `!isBurnsModule` guard
- `hasStaging: false` on acute burn entry prevents generic Depth/TBSA% staging from rendering
- 19 total diagnoses: 1 acute + 18 reconstructive (4 reconstruction + 9 expanded + 5 scar)

### Anti-Patterns — DO NOT
- DO NOT add a phase gate (segmented control/chips) — phase is implicit from diagnosis ID
- DO NOT add `phase` back to `BurnsAssessmentData` — derive from `diagnosisPicklistId` at point of use
- DO NOT create multiple acute burn diagnosis entries — single `burns_dx_acute` with assessment-derived specificity
- DO NOT use `conditionStagingMatch` for burn procedure suggestions — use `getAssessmentDrivenProcedureSuggestions()`
- DO NOT implement a free-draw body map — use tap-on-region with numeric entry only
- DO NOT duplicate free flap fields — burn free flap triggers existing free flap module
- DO NOT duplicate wound assessment — integrate with existing WoundAssessmentSheet if it exists
- DO NOT create a new episode type — use existing burns_management
- DO NOT make TBSA Tier 2/3 mandatory — Tier 1 quick entry is always sufficient
- DO NOT duplicate cross-specialty procedures (STSG, FTSG, debridement) — burns gets own IDs with burn-specific fields
- DO NOT put graft details in a modal — inline CollapsibleFormSection
- DO NOT duplicate brand components — import from client/components/brand/
- DO NOT show laterality picker for burns — burn assessment handles body region via TBSA map

### Component Registry
- `BurnsAssessment` → `client/components/burns/BurnsAssessment.tsx`
- `TBSAQuickEntry` → `client/components/burns/TBSAQuickEntry.tsx`
- `TBSARegionalBreakdown` → `client/components/burns/TBSARegionalBreakdown.tsx`
- `TBSABodyOutline` → `client/components/burns/TBSABodyOutline.tsx`
- `BurnInjuryEventSection` → `client/components/burns/BurnInjuryEventSection.tsx`
- `BurnSeverityBadges` → `client/components/burns/BurnSeverityBadges.tsx`
- `BurnEpisodeTimeline` → `client/components/burns/BurnEpisodeTimeline.tsx`
- Config: `client/lib/burnsConfig.ts` (`deriveBurnDiagnosis`, `getAssessmentDrivenProcedureSuggestions`, `isAcuteBurnDiagnosis`, `getBurnPhaseFromDiagnosis`)
- Types: `client/types/burns.ts` (`DerivedBurnDiagnosis`, `BurnsAssessmentData` without phase)
- Diagnoses: `client/lib/diagnosisPicklists/burnsDiagnoses.ts` (19 entries)

### Data Flow
- Assessment IS the diagnosis input: TBSA + injury event → `deriveBurnDiagnosis()` → specific SNOMED code
- Assessment data drives procedure suggestions: depth/TBSA/mechanism → `getAssessmentDrivenProcedureSuggestions()`
- Injury event: TreatmentEpisode.burnInjuryEvent (episode-level, captured once)
- TBSA data: BurnsAssessmentData.tbsa (per-case, may update across operations)
- Procedure details: CaseProcedure.burnProcedureDetails (per-procedure)
- Graft tracking: CaseProcedure.burnProcedureDetails.grafting (per-graft procedure)
- Outcomes: BurnOutcomeData (episode-level or per-case for graft take)
- Episode: uses existing burns_management EpisodeType

## Peripheral Nerve Module — Locked Decisions

### Architecture
- Assessment activates on diagnosis metadata (`peripheralNerveModule: true`), NOT specialty gate
- PeripheralNerveAssessment renders INLINE in DiagnosisGroupEditor (like HandTraumaAssessment)
- BrachialPlexusAssessment is a sub-module WITHIN PeripheralNerveAssessment (amber-bordered)
- NeuromaAssessment is a sub-module WITHIN PeripheralNerveAssessment (amber-bordered)
- Category renamed to "Facial & Peripheral Nerve" (display only — specialty ID remains `peripheral_nerve`)
- 4 body-region rendering paths: BP-only (skip generic picker), compression-lightweight (electrodiagnostics + ultrasound + severity), nerve-tumour-minimal (affected nerve + size + relationship), standard (full sections 1–5 + sub-modules)
- `BodyRegion` type: `'upper_extremity' | 'lower_extremity' | 'brachial_plexus' | 'facial' | 'compression' | 'nerve_tumour' | 'any'` — derived from diagnosis subcategory/metadata via `getBodyRegion()`
- Context-aware nerve picker: `getPickerGroupsForRegion(bodyRegion)` filters NERVE_GROUPS to show only relevant nerves
- `DIAGNOSIS_TO_NERVE` auto-selects nerve on mount when diagnosis maps to a specific nerve (20 entries)
- Laterality (Left/Right only) renders INSIDE the assessment module; external DiagnosisClinicalFields hidden for PN
- 7 subcategories: Upper Extremity (5), Brachial Plexus (4), Compression Neuropathies (10), Lower Extremity (5), Facial Nerve (9 xref from H&N), Neuroma (6), Nerve Tumours (4)
- Legacy ID aliases in `DIAGNOSIS_ID_ALIASES` for removed BP traction-pattern IDs → `pn_dx_bp_traumatic`
- `nerveTumourModule: true` metadata flag on 4 tumour diagnoses triggers minimal inline card
- `crossReferenceFrom: "head_neck"` marker on facial nerve entries; filtered from ALL_DIAGNOSES to prevent duplicates

### Anti-Patterns — DO NOT
- DO NOT duplicate compression neuropathy procedures — CTS, cubital tunnel stay in hand_wrist
- DO NOT duplicate digital/median/ulnar nerve repair — stay in hand_wrist, get secondary tag
- DO NOT duplicate facial reanimation procedures — stay in head_neck, get `peripheral_nerve` secondary tag
- DO NOT create separate types for brachial plexus — it's nested within PeripheralNerveAssessmentData
- DO NOT use free text for nerve identification — always use NerveIdentifier enum
- DO NOT create a hard specialty gate — use diagnosis-driven activation
- DO NOT put electrodiagnostic details in a modal — it's a collapsible inline section
- DO NOT duplicate brand components — import from client/components/brand/
- DO NOT show all nerve groups for every diagnosis — use bodyRegion-filtered picker
- DO NOT show Bilateral/N/A laterality for peripheral nerve — Left/Right only, inside the assessment module

### Cross-Specialty Rules
- Procedures with MULTIPLE specialties use the FIRST listed as primary
- CTS logged under hand_wrist context → counts for hand surgery training numbers
- CTS logged under peripheral_nerve context → also appears in peripheral nerve audit
- Brachial plexus cases can be tagged both peripheral_nerve and microsurgery
- 22 facial nerve/reanimation procedures from head_neck have `peripheral_nerve` in specialties[]
- Facial nerve diagnoses cross-referenced via `crossReferenceFrom` field, NOT duplicated

### Component Registry
- `PeripheralNerveAssessment` → `client/components/peripheral-nerve/PeripheralNerveAssessment.tsx`
- `BrachialPlexusAssessment` → `client/components/peripheral-nerve/BrachialPlexusAssessment.tsx`
- `NeuromaAssessment` → `client/components/peripheral-nerve/NeuromaAssessment.tsx`
- `NerveInjuryClassification` → `client/components/peripheral-nerve/NerveInjuryClassification.tsx`
- `ElectrodiagnosticSummaryComponent` → `client/components/peripheral-nerve/ElectrodiagnosticSummary.tsx`
- `NerveGraftDetailsComponent` → `client/components/peripheral-nerve/NerveGraftDetailsComponent.tsx`
- `NerveTransferPicker` → `client/components/peripheral-nerve/NerveTransferPicker.tsx`
- `BrachialPlexusDiagram` → `client/components/peripheral-nerve/BrachialPlexusDiagram.tsx`
- Config: `client/lib/peripheralNerveConfig.ts` (`getBodyRegion`, `DIAGNOSIS_TO_NERVE`, `deriveInjuryPatternLabel`, `isNerveTumourDiagnosis`)
- Types: `client/types/peripheralNerve.ts`
- Diagnoses: `client/lib/diagnosisPicklists/peripheralNerveDiagnoses.ts`

### Data Flow
- Nerve assessment data: DiagnosisGroup.peripheralNerveAssessment
- Brachial plexus data: DiagnosisGroup.peripheralNerveAssessment.brachialPlexus
- Neuroma data: DiagnosisGroup.peripheralNerveAssessment.neuroma
- Compression/tumour lightweight fields: on assessment (`ultrasoundPerformed`, `overallSeverity`, `tumourSizeMm`, `tumourRelationship`)
- Neuroma affected nerve: DiagnosisGroup.peripheralNerveAssessment.neuroma.affectedNerve
- Graft/conduit details: on assessment, NOT on procedure
- FFMT procedures: trigger existing FreeFlapDetailsForm via hasFreeFlap: true
- BP aetiology derived from diagnosisId (obstetric/traumatic/radiation/tumour) → filters mechanism options

## Lymphoedema Module — Locked Decisions

### Architecture
- LymphaticAssessment renders INLINE in DiagnosisGroupEditor (like HandTraumaAssessment)
- Activates on diagnosis metadata `lymphoedemaModule: true`, NOT specialty gate
- VLNT uses existing free flap infrastructure — VLNTSpecificDetails extends, not replaces
- LVA per-anastomosis tracking is inline collapsible cards, NOT modal
- Bilateral circumference measurements auto-calculate excess volume via truncated cone formula
- Follow-up is structured (timepoints + LYMQOL domains + measurements), stored per-case

### Anti-Patterns — DO NOT
- DO NOT create a hard gate between physiological/ablative procedure types
- DO NOT duplicate FreeFlapDetails for VLNT — extend with VLNTSpecificDetails
- DO NOT duplicate CollapsibleFormSection — import from existing path
- DO NOT implement full 28-item LYMQOL questionnaire — domain summaries only
- DO NOT put experimental diagnoses in a separate file — metadata flag in main file
- DO NOT create separate procedure arrays — add to single procedurePicklist
- DO NOT duplicate brand components — import from client/components/brand/
- DO NOT create assessment as modal sheet — it's inline

### Component Registry
- `LymphaticAssessment` → `client/components/lymphatic/LymphaticAssessment.tsx`
- `CircumferenceEntry` → `client/components/lymphatic/CircumferenceEntry.tsx`
- `LVAOperativeDetails` → `client/components/lymphatic/LVAOperativeDetails.tsx`
- `VLNTDetails` → `client/components/lymphatic/VLNTDetails.tsx`
- `SAPLDetails` → `client/components/lymphatic/SAPLDetails.tsx`
- `LymphaticFollowUpEntry` → `client/components/lymphatic/LymphaticFollowUpEntry.tsx`
- Config: `client/lib/lymphaticConfig.ts`
- Types: `client/types/lymphatic.ts`
- Diagnoses: `client/lib/diagnosisPicklists/lymphoedemaDiagnoses.ts`

### Data Flow
- Assessment data: DiagnosisGroup.lymphoedemaAssessment (inline)
- LVA operative data: CaseProcedure.lvaOperativeDetails (per-procedure)
- VLNT extension data: CaseProcedure.vlntDetails (extends free flap)
- SAPL data: CaseProcedure.saplDetails (per-procedure)
- Follow-up data: stored per-case, linked by patient identifier
- Staging: server/diagnosisStagingConfig.ts (ISL required, Cheng/ICG optional)

## General Category Restructure — Locked Decisions

### Architecture
- General has NO specialty-specific assessment component (no GeneralAssessment)
- General uses standard case entry: diagnosis → staging (if applicable) → procedures
- Diagnoses are organised into 10 subcategories (section headers in picker)
- NPUAP staging (pressure injuries) and Hurley staging (HS) already exist — no new staging systems needed

### Anti-Patterns — DO NOT
- DO NOT create a GeneralAssessment component — it is not needed
- DO NOT duplicate skin cancer diagnoses — REMOVED from General, they live in Skin Cancer module
- DO NOT duplicate lymphoedema diagnoses or procedures — they live in Lymphoedema module
- DO NOT create new types files — use existing DiagnosisPicklistEntry and ProcedureSuggestion
- DO NOT use `gen_other_pilonidal_excision` — REPLACED by 3 specific pilonidal procedures
- DO NOT add diabetic foot to General — it stays in Orthoplastic
- DO NOT add generic lymphoedema to General — it stays in Lymphoedema (29 diagnoses)
- DO NOT duplicate brand components — import from client/components/brand/

### Cross-Specialty Rules
- Nec fasc trunk/perineal/cervical → PRIMARY in General
- Nec fasc extremity → PRIMARY in Orthoplastic (existing `orth_dx_nec_fasc`), General cross-tag on procedures
- Sarcoma procedures → cross-tagged `["general", "orthoplastic"]`
- GAS diagnoses → PRIMARY in General; breast GAS procedures (`breast_ga_*`) stay in Breast
- VRAM flap → cross-tagged `["head_neck", "general"]` for perineal use
- Abdominal wall / chest wall procedures → PRIMARY in General

### Subcategory Order (in diagnosis picker)
1. Soft Tissue Infections
2. Trunk & Torso Reconstruction
3. Soft Tissue Tumours
4. Perineal & Genitourinary
5. Pressure Injury
6. HS & Pilonidal Disease
7. Benign Lesions, Scars & Wounds
8. Soft Tissue Trauma
9. Gender-Affirming Surgery
10. Congenital Conditions

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

### E2EE scaffolding

- Per-device X25519 key pairs stored securely
- Public keys registered with server, revocable
- Case key wrapping infrastructure in place

### Encrypted media (file-based AES-256-GCM)

**Architecture:** Per-image DEK model with file-system storage. Each photo gets a random 256-bit DEK, encrypted via AES-256-GCM (`@noble/ciphers`). The DEK is wrapped with the master key (AES-256-GCM) and stored in plaintext `meta.json`. Cipher provider remains isolated in `mediaEncryption.ts` for a future native file-crypto swap if profiling warrants it.

**Storage layout:**

```
{Paths.document}/opus-media/{uuid}/
  image.enc    — AES-256-GCM encrypted full image (nonce||ciphertext||tag)
  thumb.enc    — AES-256-GCM encrypted 300px JPEG thumbnail
  meta.json    — { version:2, mediaId, wrappedDEK (hex), mimeType, width, height, hasThumb, createdAt }
```

**URI scheme:** `opus-media:{uuid}` — routed by `mediaStorage.ts`.

**Display pipeline:** `EncryptedImage` → `useDecryptedImage` hook → decrypts to temp file in `Paths.cache` → renders via `expo-image` with `file:///` URI. LRU temp-file cache: 80 thumbnails (~2MB), 10 full images (~50MB). Max 2 concurrent decryptions.

**Security lifecycle:**

- DEK zeroed after use (`dek.fill(0)`)
- Decrypted temp files cleared on startup, logout, delete, and every app background transition (regardless of app lock config)
- Thumbnails encrypted
- Delete paths are idempotent (deletes directory)
- No plaintext on persistent storage — only in `Paths.cache` (OS-reclaimable)

**Capture pipeline:** ImagePicker returns file URIs → `getImageBytesFromUri()` in `thumbnailGenerator.ts` re-encodes (inherently stripping EXIF) + extracts bytes → `generateThumbnailBytes()` creates 300px/0.6 thumbnail → `saveMediaV2()` encrypts both with per-image DEK → writes `image.enc` + `thumb.enc` + `meta.json`. Base64 is transient (decoded immediately, never stored). Single ImageManipulator pass — no double-encoding.

**Operational:**

- `MediaManagementScreen` stages edits locally, prompts Save/Discard on dirty exit, deletes removed media on save, and cleans up newly imported media on discard
- User-facing batch media cap standardised to 15 across case/discharge/media-management surfaces
- Cleanup on case/photo delete (deletes media directory)

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
- **Version:** 2.5.0, buildNumber 8 (app.json) — EAS assigns remote buildNumber (e.g. 1.2.52) because `eas.json` has `appVersionSource: "remote"` + production `autoIncrement: true`
- **New Architecture:** enabled
- **React Compiler:** enabled (experimental)

### EAS / TestFlight operational lessons

Hard-won during the 2026-04-17 shipping session. Read these BEFORE submitting the next TestFlight build.

**Lockfile discipline — never use `--legacy-peer-deps` on this repo.**
- EAS runs strict `npm ci --include=dev`, which fails the moment a peer dep is in `package.json` but not in `package-lock.json`
- `--legacy-peer-deps` silently skips peer dep resolution locally, so the mismatch doesn't surface until EAS rejects it
- `react-native-mmkv@^4.2.0` requires `react-native-nitro-modules` as a peer dep — it must be an explicit direct dependency, not a phantom peer
- If you must resolve a React/react-dom peer conflict, use `npx expo install <pkg>` (respects SDK compat) or pin versions to match React 19.1 exactly

**Apple agreements expire without warning.**
- Apple silently invalidates the upload token (403 `FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`) when any Developer Program, Paid Applications, or Free Applications agreement lapses or gets revised
- The `links: { see: "/business" }` field in the error points to App Store Connect → **Business** (not the Program License tab) — that's where the "Active / Ready to Sign / Expired" state lives
- Only the **Account Holder** Apple ID can sign agreements. Admin or App Manager roles will see the Sign button greyed out
- After signing, propagation to the submit API can take up to **24h** (often minutes, but not always instant)

**`eas submit` against an already-attempted build silently fails with zero logs.**
- Manual `eas submit --id <buildId>` retries against a build whose previous submission errored will fail in ~30s with no error detail, empty `error` object, empty `logFiles[]`, and empty `workflowJob.errors[]` via GraphQL
- `--verbose` and `--verbose-fastlane` make no difference in non-interactive mode
- **Recovery pattern:** trigger a fresh build with `autoSubmit: true`. The auto-submit inside a build job reaches fastlane reliably and produces readable logs (success or failure). This is the canonical "unstick it" move.
- The dashboard URL (`https://expo.dev/accounts/gladmat/projects/surgical-logbook/submissions/<id>`) renders the raw job logs in a format the GraphQL API doesn't expose — if you can't see the error from the CLI or MCP, check there

**Expo log blob format is proprietary.**
- `JobRun.logFileUrls` returns storage.googleapis.com URLs containing a binary log container starting with `0b 54 31 00` / `8b 53 31 00` ("T1" / "S1" magic bytes) — NOT gzip, NOT zstd, NOT brotli
- Don't waste time trying to decode these outside the Expo dashboard; use the dashboard or accept that submission failures need browser-based debugging

**Build numbers are managed remotely.**
- `eas.json` has `appVersionSource: "remote"` + production `autoIncrement: true`
- The `buildNumber` in `app.json` is effectively documentation — EAS overwrites it from its own counter at build time (e.g. `1.2.51`, `1.2.52`)
- Bumping app.json is still good hygiene for diff review, but don't expect it to be authoritative

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
- **Encrypted URIs** — `opus-media:{uuid}` scheme for media references
- **Draft auto-save** — debounced + AppState background flush

## Operative role & supervision model

Three independent dimensions:

1. **Operative Role** (`OperativeRole`): `SURGEON`, `FIRST_ASST`, `SECOND_ASST`, `OBSERVER`, `SUPERVISOR`
2. **Supervision Level** (`SupervisionLevel`): `INDEPENDENT`, `SUP_AVAILABLE`, `SUP_PRESENT`, `SUP_SCRUBBED`, `DIRECTED`, `NOT_APPLICABLE`
3. **Responsible Consultant** (`responsibleConsultantName`): case-level named field

### Architecture

- **Case-level defaults:** `defaultOperativeRole` and `defaultSupervisionLevel` on `Case` — all procedures inherit these
- **Per-procedure override:** `operativeRoleOverride` and `supervisionLevelOverride` on `CaseProcedure` — zero taps for the common case, "Override" link available when needed
- **Resolution chain:** `resolveOperativeRole(override?, default?)` → override > default > `"SURGEON"` fallback
- **Supervision auto-clear:** only applicable for `SURGEON` role via `supervisionApplicable()` — non-SURGEON roles auto-resolve to `NOT_APPLICABLE`
- **Smart defaults:** `suggestRoleDefaults(profile)` → consultants get `SURGEON + INDEPENDENT`, trainees get `SURGEON + SUP_SCRUBBED`
- **Export compat:** `toNearestLegacyRole(role, supervision)` maps to legacy code for export/sync.

### Per-procedure team roles & presence

Beyond the case-owner role model above, each `CaseProcedure` carries a **per-procedure team override** so a long session with multiple procedures can record who did what without duplicating the case.

- **`CaseProcedure.teamRoleOverrides: Record<contactId, TeamMemberOperativeRole>`** — overrides the case-level role for specific team contacts on this procedure (e.g. a senior trainee who was SURGEON on procedure 2 but FIRST_ASST on procedure 1)
- **`CaseProcedure.teamMemberPresence: Record<contactId, boolean>`** — per-procedure presence toggles so a team member tagged on the case but not scrubbed for a given procedure is excluded from that procedure's attribution
- **`ProcedureTeamFooter`** (`client/components/ProcedureTeamFooter.tsx`) — compact footer rendered under each procedure card inside `DiagnosisProcedureSection`. Shows abbreviated member names, resolved role labels, and a "tap to override" surface. A global procedure offset is computed so the footer numbering matches the visible case-wide procedure order.
- **Reducer actions** (`useCaseForm`): `SET_PROCEDURE_ROLE_OVERRIDE`, `TOGGLE_MEMBER_PROCEDURE_PRESENCE`
- **Display:** `CaseDetailScreen` shows abbreviated names and resolved role labels per procedure in read-only mode

### EPA target storage (local)

EPA pairs derived from the seniority chain at save time are also persisted locally so the learning-curve dashboard can track assessment progress without waiting for server assessments.

- **API:** `saveEpaTargets(caseId, targets)` / `getEpaTargets(caseId)` in `client/lib/assessmentStorage.ts`
- **Derivation:** runs on case save via `deriveEpaPairs()` (seniority-chain algorithm in `client/lib/epaDerivation.ts`)
- **Failure mode:** non-blocking — EPA derivation errors do not prevent case save

### Key files

| File                                         | Purpose                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `client/types/operativeRole.ts`              | Types, labels, helpers, 6 export format mappings (RACS MALT, JDocs, UK eLogbook, ACGME, German, Swiss) |
| `client/lib/roleDefaults.ts`                 | Smart defaults, `isConsultantLevel()`, `suggestRoleDefaults()`                                                    |
| `client/lib/__tests__/operativeRole.test.ts` | 68 tests covering resolution, export mappings                                                                     |

### Export-time format derivation

RACS MALT codes and other training-programme formats are derived at export time (never stored):

- `toRacsMaltPlastics(role, supervision)` → RACS MALT Plastics format
- `toRacsMaltJDocs(role, supervision)` → JDocs format
- `toUkElogbook(role, supervision)` → UK eLogbook code
- `toAcgmeGeneralSurgery(role, supervision)` → ACGME format
- `toGermanWeiterbildung(role, supervision)` → German Weiterbildung format
- `toSwissSiwf(role, supervision)` → Swiss SIWF format

### Team sharing & operative team architecture

**Two separate team member concepts coexist on CaseFormState:**

1. **`operativeTeam: CaseTeamMember[]`** — Contact-based team tagging from Phase 3. Members come from `team_contacts` table, selected via chip-based UI in the Team section. Stored on the Case, included in SharedCaseData blob, persisted in drafts. Facility-change auto-clears the array. Members may or may not be Opus users (`linkedUserId` is optional).

2. **`teamMembers: { userId, displayName, role, publicKeys }[]`** — Legacy share-on-save E2EE field. Members added via email search (`TeamMemberTagging` component, currently unused after Phase 3 moved tagging to TeamSection). Kept for backward compatibility with existing share pipeline.

**Share-on-save bridge:** At save time, both arrays merge into `shareableMembers`. Linked `operativeTeam` members have their device keys fetched via `GET /api/users/:id/keys`. Deduplication prevents double-sharing. Non-blocking — share failure doesn't block case save.

**Key files:** `client/types/teamContacts.ts` (CaseTeamMember, TeamContact, TeamMemberOperativeRole), `client/lib/teamContactsApi.ts` (CRUD + device keys + invitations), `client/components/case-form/TeamSection.tsx` (chip UI), `shared/careerStages.ts` (88 career stages, 6-tier seniority), `client/lib/seniorityTier.ts` (getSeniorityTier, isSeniorTo), `client/lib/epaDerivation.ts` (seniority-chain EPA pair algorithm), `client/lib/assessmentRoles.ts` (seniority-tier-based role detection), `client/lib/discoveryService.ts` (background contact discovery), `client/lib/assessmentAnalytics.ts` (learning curves, teaching aggregate, calibration).

## Testing

- **Framework:** Vitest 4.0.18, **1452 tests** across 75 files
- **Client tests:** `client/lib/__tests__/` and `client/components/` — covering hand trauma (diagnosis, mapping, ux), skin cancer (config 89, phase4 11, phase5 18, diagnoses 7), dashboard (selectors 7), hand (infection 42, elective 103), dupuytren (37), joint implant (44), osteotomy (18), media (encryption 7, fileStorage 3, tagHelpers 82, captureProtocols 41, operativeMedia 19, form 4, defaults 4, context 3), inbox (storage 13, assignment 17), capture (smartImportPrefs 10, sharedIngress 2), case (specialty 5, storageCache 4, draftPersistence 1), statistics (helpers 3, stats 7), dates (values 12, normalization 4), export (implant 3, breast), planned case (18), media organiser (15), NHI validation (12), patient identity (11), operative role (68), head & neck integration (4), breast (phase3, phase4, export), FISS calculator (12), craniofacial, aesthetics, burns, peripheral nerve, lymphoedema, team contacts (11), operative team (15), sharing bridge (8), EPA derivation (14), assessment roles + calibration (22), plus media UI coverage
- **Server tests:** `server/__tests__/` — auth (17), validation (7), diagnosisStagingConfig (3), teamContacts (17), invitations (6)
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
8. **Section nav bar** — all 6 pills (Patient, Team, Case, Operative, Media, Outcomes) visible without horizontal scrolling
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

## AI Testing & Visual Quality Standards

This section exists so that Claude Code can autonomously navigate, test, and evaluate the Opus Logbook app using the Expo MCP Server. Read this section before any testing, UI review, or screenshot analysis task.

**Last updated from codebase scan: 2026-03-19**

### App Screen Map

#### Root navigator (`client/navigation/RootStackNavigator.tsx`)

Conditional screen switching based on `isAuthenticated`, `hasSeenWelcome`, `hasSeenFeatures`, and `onboardingComplete`:

**Pre-auth flow (sequential gates):**

| Gate | Screen | File |
|------|--------|------|
| `!hasSeenWelcome` | Welcome | `client/screens/onboarding/WelcomeScreen.tsx` |
| `!hasSeenFeatures` | Features | `client/screens/onboarding/FeaturePager.tsx` |
| `showEmailAuth` | EmailSignup | `client/screens/onboarding/EmailSignupScreen.tsx` |
| Default | Auth | `client/screens/AuthScreen.tsx` (`screen-auth`) |

**Onboarding flow** (post-auth, `!onboardingComplete`):

| Step | Screen | File |
|------|--------|------|
| categories | Categories | `client/screens/onboarding/CategoriesScreen.tsx` |
| training | Training | `client/screens/onboarding/TrainingScreen.tsx` |
| hospital | Hospital | `client/screens/onboarding/HospitalScreen.tsx` |
| privacy | Privacy | `client/screens/onboarding/PrivacyScreen.tsx` |

**Main tab navigator** (`client/navigation/MainTabNavigator.tsx`):

| Tab | Name | Stack Navigator | testID |
|-----|------|-----------------|--------|
| Cases | `DashboardTab` | `DashboardStackNavigator.tsx` | `main.tab-dashboard` |
| Statistics | `StatisticsTab` | `StatisticsStackNavigator.tsx` | `main.tab-statistics` |
| Settings | `SettingsTab` | `SettingsStackNavigator.tsx` | `main.tab-settings` |

**Authenticated modal/push screens** (on root stack):

| Name | File | testID | Presentation |
|------|------|--------|-------------|
| CaseDetail | `CaseDetailScreen.tsx` | `screen-caseDetail` | push |
| CaseForm | `CaseFormScreen.tsx` | `screen-caseForm` | push |
| AddCase | `AddCaseScreen.tsx` | — | push |
| AddTimelineEvent | `AddTimelineEventScreen.tsx` | `screen-addTimelineEvent` | modal |
| MediaManagement | `MediaManagementScreen.tsx` | `screen-mediaManagement` | fullScreenModal |
| AddOperativeMedia | `AddOperativeMediaScreen.tsx` | `screen-addOperativeMedia` | fullScreenModal |
| EpisodeDetail | `EpisodeDetailScreen.tsx` | `screen-episodeDetail` | push |
| EpisodeList | `EpisodeListScreen.tsx` | `screen-episodeList` | push |
| SetupAppLock | `SetupAppLockScreen.tsx` | `screen-setupAppLock` | push |
| EditProfile | `EditProfileScreen.tsx` | `screen-editProfile` | push |
| ManageFacilities | `ManageFacilitiesScreen.tsx` | `screen-manageFacilities` | push |
| SurgicalPreferences | `SurgicalPreferencesScreen.tsx` | `screen-surgicalPreferences` | push |
| Personalisation | `PersonalisationScreen.tsx` | `screen-personalisation` | push |
| CaseSearch | `CaseSearchScreen.tsx` | `screen-caseSearch` | modal |
| NeedsAttentionList | `NeedsAttentionListScreen.tsx` | `screen-needsAttention` | push |
| Inbox | `InboxScreen.tsx` | `screen-inbox` | push |
| SmartImport | `SmartImportScreen.tsx` | `screen-smartImport` | fullScreenModal |
| OpusCamera | `OpusCameraScreen.tsx` | `screen-opusCamera` | fullScreenModal |
| GuidedCapture | `GuidedCaptureScreen.tsx` | `screen-guidedCapture` | fullScreenModal |
| PlanCase | `PlanCaseScreen.tsx` | `screen-planCase` | fullScreenModal |
| PlannedCaseList | `PlannedCaseListScreen.tsx` | `screen-plannedCaseList` | push |
| CaseMediaOrganiser | `CaseMediaOrganiserScreen.tsx` | `screen-caseMediaOrganiser` | modal |
| AddHistology | `AddHistologyScreen.tsx` | `screen-addHistology` | push |
| TeamContacts | `TeamContactsScreen.tsx` | `screen-teamContacts` | push |
| AddEditTeamContact | `AddEditTeamContactScreen.tsx` | `screen-addEditTeamContact` | push |

**Lock overlay:** `LockScreen.tsx` (`screen-lock`) renders as absolute overlay when `isAppLockConfigured && isLocked`.

**Total: 40 screen files** (31 main + 9 onboarding).

### Diagnosis Inventory

| Specialty | File | Count | Staging Systems | Module Trigger |
|-----------|------|-------|-----------------|----------------|
| Hand Surgery | `handSurgeryDiagnoses.ts` | 103 | Gustilo-Anderson, Eaton-Littler, Herbert, Lichtman, Kanavel Signs | `hand_wrist` specialty + `caseType` gate |
| Head & Neck | `headNeckDiagnoses.ts` | 88 | TNM (T/N/M + Overall), House-Brackmann, Le Fort, Pittsburgh Fistula, Whitaker | `head_neck` specialty |
| Aesthetics | `aestheticsDiagnoses.ts` | 42 | Baker Classification | `aesthetics` specialty or `aes_`/`bc_` procedure prefix |
| Burns | `burnsDiagnoses.ts` | 19 | Depth, TBSA %, Severity | `burns` specialty (acute: `burns_dx_acute` only) |
| Cleft/Craniofacial | `cleftCranioDiagnoses.ts` | 38 | Veau Classification | `cleft_cranio` specialty |
| Breast | `breastDiagnoses.ts` | 37 | — | `breast` specialty |
| Peripheral Nerve | `peripheralNerveDiagnoses.ts` | 43 (34 native + 9 facial nerve cross-ref) | EMG Grade, Severity | `peripheral_nerve` specialty or diagnosis metadata |
| General | `generalDiagnoses.ts` | 57 | NPUAP Stage, Hurley Stage | Default (no special module) |
| Lymphoedema | `lymphoedemaDiagnoses.ts` | 29 | ISL Stage, Cheng Grade, MD Anderson ICG | `lymphoedema` specialty or diagnosis metadata |
| Orthoplastic | `orthoplasticDiagnoses.ts` | 14 | Gustilo-Anderson | Free flap / pedicled flap module |
| Skin Cancer | `skinCancerDiagnoses.ts` | 11 | Breslow Thickness, Ulceration, TNM (AJCC 8th Ed) | Diagnosis-driven (`hasEnhancedHistology` or SNOMED match) |
| Body Contouring | `bodyContouringDiagnoses.ts` | (deprecated — re-exports from aesthetics) | — | — |

**Total: 481 structured diagnoses** across 11 active picklist files (body contouring is deprecated/merged into aesthetics).

**29 staging systems** defined in `server/diagnosisStagingConfig.ts`: Gustilo-Anderson, Breslow Thickness, Ulceration, Severity, EMG Grade, TNM T/N/M Stage, NPUAP Stage, Depth, TBSA %, Baker Classification, Hurley Stage, ISL Stage, Cheng Lymphoedema Grade, MD Anderson ICG Stage, Wagner Grade, Le Fort Classification, House-Brackmann Grade, Kanavel Signs, Eaton-Littler Stage, Herbert Classification, Lichtman Stage, Veau Classification, Pittsburgh Fistula Classification, Whitaker Classification, TNM T/N/M Stage (AJCC 8th Ed), Overall Stage (AJCC 8th Ed).

### Case Form Architecture

Component tree based on verified file existence:

```
CaseFormScreen.tsx
├── SectionNavBar (6 pills: Patient, Team, Case, Operative, Media, Outcomes)
│
├── PatientInfoSection.tsx              — client/components/case-form/PatientInfoSection.tsx
├── TeamSection.tsx                     — client/components/case-form/TeamSection.tsx
├── CaseSection.tsx                     — client/components/case-form/CaseSection.tsx
│   ├── DiagnosisProcedureSection.tsx   — client/components/case-form/DiagnosisProcedureSection.tsx
│   │   └── DiagnosisGroupEditor.tsx    — client/components/DiagnosisGroupEditor.tsx
│   │       ├── SkinCancerAssessment    — client/components/skin-cancer/SkinCancerAssessment.tsx
│   │       │   ├── SkinCancerPathwayGate.tsx
│   │       │   ├── PathologySection.tsx
│   │       │   ├── HistologySection.tsx
│   │       │   ├── LesionDetailsSection.tsx
│   │       │   ├── SLNBSection.tsx
│   │       │   ├── ReExcisionPromptCard.tsx
│   │       │   ├── CompletionSummary.tsx
│   │       │   └── SkinCancerSummaryPanel.tsx
│   │       ├── HandTraumaAssessment    — client/components/hand-trauma/HandTraumaAssessment.tsx
│   │       ├── AcuteHandAssessment     — client/components/acute-hand/AcuteHandAssessment.tsx
│   │       │   ├── AcuteHandSummaryPanel.tsx
│   │       │   └── HandInfectionCard   — client/components/hand-infection/HandInfectionCard.tsx
│   │       ├── HandElectivePicker      — client/components/hand-elective/HandElectivePicker.tsx
│   │       │   ├── HandElectiveAssessment.tsx
│   │       │   └── CorrectiveOsteotomyDetails.tsx
│   │       ├── DupuytrenAssessment     — client/components/dupuytren/DupuytrenAssessment.tsx
│   │       ├── BreastAssessment        — client/components/breast/BreastAssessment.tsx
│   │       │   ├── BreastContextSelector.tsx
│   │       │   ├── BreastProgressiveAssessment.tsx
│   │       │   ├── BreastSideCard.tsx
│   │       │   ├── ImplantDetailsCard.tsx
│   │       │   ├── BreastFlapCard.tsx
│   │       │   ├── BreastFlapExtensionSection.tsx
│   │       │   ├── LipofillingCard.tsx
│   │       │   └── LiposuctionCard.tsx
│   │       ├── CraniofacialAssessment  — client/components/craniofacial/CraniofacialAssessment.tsx
│   │       ├── AestheticAssessment     — client/components/aesthetics/AestheticAssessment.tsx
│   │       │   └── PostBariatricContext.tsx
│   │       ├── BurnsAssessment         — client/components/burns/BurnsAssessment.tsx
│   │       │   ├── BurnSeverityBadges.tsx
│   │       │   └── ExcisionDetailsSection.tsx
│   │       ├── PeripheralNerveAssessment — client/components/peripheral-nerve/PeripheralNerveAssessment.tsx
│   │       │   ├── BrachialPlexusAssessment.tsx
│   │       │   ├── NerveInjuryClassification.tsx
│   │       │   ├── ElectrodiagnosticSummary.tsx
│   │       │   └── NeuromaAssessment.tsx
│   │       ├── LymphaticAssessment     — client/components/lymphatic/LymphaticAssessment.tsx
│   │       │   ├── LVAOperativeDetails.tsx
│   │       │   ├── VLNTDetails.tsx
│   │       │   └── SAPLDetails.tsx
│   │       ├── JointImplantSection     — client/components/joint-implant/JointImplantSection.tsx
│   │       ├── MultiLesionEditor       — client/components/MultiLesionEditor.tsx
│   │       ├── ProcedureClinicalDetails — client/components/ProcedureClinicalDetails.tsx
│   │       ├── ProcedureTeamFooter     — client/components/ProcedureTeamFooter.tsx
│   │       ├── InfectionOverlayForm    — client/components/InfectionOverlayForm.tsx
│   │       ├── WoundAssessmentForm     — client/components/WoundAssessmentForm.tsx
│   │       └── FlapOutcomeSection      — client/components/FlapOutcomeSection.tsx
│   └── TreatmentContextSection.tsx     — client/components/case-form/TreatmentContextSection.tsx
│       └── JointCaseContextSection.tsx — client/components/case-form/JointCaseContextSection.tsx
├── OperativeSection.tsx                — client/components/case-form/OperativeSection.tsx
├── OperativeMediaSection.tsx           — client/components/OperativeMediaSection.tsx
├── OutcomesSection.tsx                 — client/components/case-form/OutcomesSection.tsx
└── CaseSummaryView.tsx                 — client/components/case-form/CaseSummaryView.tsx
```

All components above verified to exist at the listed paths.

### Module Activation Logic

Defined in `client/lib/moduleVisibility.ts`. The `getModuleVisibility()` function returns a `ModuleVisibility` object with 13 boolean flags:

| Module | Activation Rule |
|--------|----------------|
| `flapDetails` | Any procedure maps to a free flap via `PICKLIST_TO_FLAP_TYPE` or has `free_flap` tag |
| `flapOutcome` | Same as `flapDetails` |
| `handTraumaAssessment` | `specialty === "hand_wrist" && handCaseType === "trauma"` |
| `infection` | Infection subcategory procedure, or `infectionOverlay` exists, or hand infection escalated |
| `woundAssessment` | Procedure has `complex_wound` tag, or episode type is `wound_management`/`burns_management`, or existing data |
| `skinCancerAssessment` | `specialty === "skin_cancer"`, or SNOMED code match via `shouldActivateSkinCancerModuleForSnomed()`, or existing data |
| `implant` | Any procedure has `hasImplant: true` via `procedureHasImplant()` |
| `breast` | `isBreastSpecialty(specialty)` — specialty-gated |
| `craniofacialAssessment` | `specialty === "cleft_cranio"` — specialty-gated |
| `aestheticAssessment` | `specialty === "aesthetics"`, or procedure has `aes_`/`bc_` prefix, or existing data |
| `burnsAssessment` | `specialty === "burns" && diagnosisPicklistId === "burns_dx_acute"` or existing data |
| `peripheralNerveAssessment` | `specialty === "peripheral_nerve"` or existing data |
| `lymphoedemaAssessment` | `specialty === "lymphoedema"` or existing data |

### testID Convention

Every `testID` follows: `scope.section.element-qualifier`

- Segments: camelCase
- Hierarchy separator: dots (`.`)
- Qualifier separator: hyphens (`-`)
- Dynamic items: Use domain IDs not array indices where possible (e.g., `card-${caseData.id}` not `card-${index}`)

Element type abbreviations:

| Abbreviation | Used for |
|-------------|----------|
| `btn` | Buttons, CTAs |
| `chip` | Selection chips |
| `toggle` | Boolean toggles |
| `picker` | Pickers, selection modals |
| `input` | Text/number inputs |
| `card` | Tappable cards |
| `row` | Tappable list rows |
| `section` | Collapsible section headers |
| `tab` | Tab bar items |
| `scroll` | ScrollView / FlatList |
| `badge` | Status/completion indicators |
| `option` | Individual options in pickers |
| `gate` | Pathway gate options |

**Scope prefixes in use:**

| Scope | Example |
|-------|---------|
| `screen-*` | `screen-dashboard`, `screen-caseForm` |
| `main.*` | `main.tab-dashboard`, `main.tab-statistics`, `main.tab-settings` |
| `caseForm.*` | `caseForm.nav.pill-case`, `caseForm.hand.chip-digit-thumb` |
| `caseDetail.*` | `caseDetail.btn-actions`, `caseDetail.btn-addHistology` |
| `dashboard.*` | `dashboard.fab.btn-logCase`, `dashboard.cases.card-${id}` |
| `settings.*` | `settings.row-editProfile`, `settings.profile.input-firstName` |
| `statistics.*` | `statistics.card-${specialty}`, `statistics.btn-seeAllMilestones` |
| `onboarding.*` | `onboarding.profile.input-firstName`, `onboarding.country.card-nz` |
| `episodeDetail.*` | `episodeDetail.btn-changeStatus-${status}` |
| `episodes.*` | `episodes.card-${id}` |
| `histology.*` | `histology.chip-category-${value}` |
| `timelineEvent.*` | `timelineEvent.btn-save` |

Duplicate check:
```bash
grep -roh 'testID="[^"]*"' client/ | sort | uniq -d
# Must return empty
```

**Current testID count: 193 unique static + 94 unique dynamic patterns = 287 total testID definitions.**

### Visual Standards

#### Colour Tokens (from `client/constants/theme.ts`)

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `backgroundRoot` | `#0C0F14` | `#FFFFFF` | App canvas / screen background |
| `backgroundElevated` | `#161B22` | `#FFFFFF` | Cards, elevated surfaces |
| `backgroundSecondary` | `#1C2128` | `#F6F8FA` | Secondary surfaces, raised areas |
| `text` | `#E6EDF3` | `#1F2328` | Primary body text |
| `textSecondary` | `#8B949E` | `#656D76` | Secondary / label text |
| `textTertiary` | `#656D76` | `#8B949E` | Tertiary / hint text |
| `accent` | `#E5A00D` | `#E5A00D` | Brand amber — interactive elements ONLY |
| `link` | `#E5A00D` | `#B47E00` | Tappable text, active states |
| `border` | `#2D333B` | `#D0D7DE` | Card borders, dividers |
| `buttonText` | `#0C0F14` | `#FFFFFF` | Text on amber-filled buttons |
| `success` | `#2EA043` | `#1A7F37` | Positive outcomes, completion |
| `warning` | `#D29922` | `#9A6700` | Caution states |
| `error` | `#F85149` | `#CF222E` | Errors, destructive actions |
| `info` | `#58A6FF` | `#0969DA` | Informational badges |
| `tabIconSelected` | `#E5A00D` | `#B47E00` | Active tab icon |
| `tabIconDefault` | `#656D76` | `#8B949E` | Inactive tab icon |
| `rolePrimary` | `#E5A00D` | `#B47E00` | Surgeon role badge |
| `roleSupervising` | `#D8B4FE` | `#8250DF` | Supervisor role badge |
| `roleAssistant` | `#86EFAC` | `#1A7F37` | Assistant role badge |
| `roleTrainee` | `#7DD3FC` | `#0969DA` | Trainee role badge |

**Amber rule:** The accent colour (`#E5A00D` dark / `#B47E00` light) appears ONLY on: logo, CTA button fills, selected borders, progress bars, active tab icons, link text. Never on static icons, illustrations, or body text.

#### Touch Targets & Spacing

| Rule | Minimum | Standard |
|------|---------|----------|
| Tappable element height | 44pt | 48–56pt |
| Tappable element width | 44pt | — |
| CTA button height | — | 56pt |
| Spacing between tappable elements | 8pt | 12pt |
| Horizontal padding | 16pt min | 24pt standard |
| Grid unit | 8pt | — |

#### Contrast (WCAG AA)

| Element | Minimum Ratio | Against |
|---------|---------------|---------|
| Body text | 4.5:1 | `backgroundRoot` |
| Large text (≥18pt bold / ≥24pt) | 3:1 | `backgroundRoot` |
| Interactive elements | 3:1 | Adjacent background |

### Testing Workflows for Expo MCP

**Prerequisites:**

- Metro: `EXPO_UNSTABLE_MCP_SERVER=1 npx expo start --dev-client`
- Simulator booted with dev build
- Test account 1: `m.gladysz@outlook.com` / `testtest` / PIN: `1111`
- Test account 2: `mateo.gladysz@outlook.com` / `test2test2`

#### Workflow 1: Full Visual Audit

Systematically screenshot every screen in the screen map above. For each:

1. Navigate to the screen
2. `automation_take_screenshot()`
3. Evaluate against visual standards (colours, touch targets, contrast, spacing, amber rule)
4. For screens with collapsible sections, screenshot both collapsed and expanded states
5. Log findings as: `[SCREEN] [SEVERITY] [DESCRIPTION]`

#### Workflow 2: Diagnosis Smoke Test (All Specialties)

For each specialty in the Diagnosis Inventory above:

1. Open new case → select the specialty
2. Open diagnosis picker → search for the first diagnosis in that specialty's picklist
3. Verify it appears, select it
4. Verify any expected staging system renders (check the picklist entry's `stagingSnomedCode` field)
5. Verify the expected specialty module renders (per Module Activation Logic table)
6. Verify suggested procedures appear
7. Screenshot and move to next specialty

This is a QUICK per-specialty check, NOT per-diagnosis. Use the Dynamic Testing Suite for exhaustive per-diagnosis testing.

#### Workflow 3: Comprehensive Per-Diagnosis Testing

Defer to the Dynamic Testing Suite prompt. That prompt reads the actual picklist files and tests every single diagnosis entry. This section provides the visual standards and testID conventions that the dynamic suite references.

#### Workflow 4: Progressive Disclosure Integrity

For each specialty module that exists (12 modules verified):

1. Select a diagnosis that triggers the module
2. Screenshot collapsed state — verify only relevant sections visible
3. Expand each collapsible section, screenshot
4. Verify no cross-specialty contamination (e.g., no breast fields when hand selected)

**Modules to test:** HandTrauma, AcuteHand, HandElective, Dupuytren, SkinCancer, Breast, Craniofacial, Aesthetic, Burns, PeripheralNerve, Lymphatic, JointImplant.

#### Workflow 5: Edge Cases

1. Save empty form → verify validation errors on `patientIdentifier`, `procedureDate`, `facility`
2. Case list with no cases → verify `DashboardEmptyState`
3. Long patient name → verify truncation with `numberOfLines` + ellipsis
4. Diagnosis picker with no results → verify "no results" state
5. Start case → cancel → verify discard confirmation
6. Multi-diagnosis group → verify group indexing and deletion

### Screenshot Analysis Checklist

When evaluating a screenshot, check in this order:

1. **Layout** — Safe areas respected, consistent padding (`Spacing` constants: 4/8/12/16/20/24), nothing cut off
2. **Colour** — Correct background shade per `theme.*` tokens, amber only on permitted elements, card surfaces use `backgroundElevated`
3. **Typography** — Nothing below 12pt (`caption`), hierarchy via weight not just size, `SF Mono` for numeric data
4. **Touch targets** — All buttons/chips ≥ 44pt, sufficient spacing between tappable elements
5. **Content** — No placeholder text, no debug labels, helpful empty states
6. **Progressive disclosure** — Only relevant modules visible for selected specialty (per activation logic table)
7. **Dark mode** — All surfaces use `theme.backgroundRoot` / `theme.backgroundElevated` / `theme.backgroundSecondary`, never raw hex

### Maestro E2E Test Conventions

Directory: `.maestro/` at project root
File naming: `{flow-name}.yaml`
App ID: `com.drgladysz.opus`
Selectors: Always use `id:` (testID), never `text:` (text changes break tests)

```yaml
# Template
appId: com.drgladysz.opus
---
- launchApp
- tapOn:
    id: "main.tab-dashboard"
- assertVisible:
    id: "screen-dashboard"
```

## Design Quality & Aesthetics

<opus_design_philosophy>
Opus is a precision instrument for surgeons, not a consumer social app. Every pixel must communicate competence, restraint, and respect for the user's time. The aesthetic reference points are Bloomberg Terminal (information density done right), Linear (opinionated dark-mode craftsmanship), and Stryker surgical instruments (radical simplicity as confidence signal).

You tend toward generic, "safe" UI output. For Opus, generic is wrong — it reads as amateur to surgeon users who work with precision instruments daily. Be intentional with every choice. But intentional does NOT mean decorative — it means every element earns its place.

When building or modifying UI:
- Consult the installed Expo `building-native-ui` skill (`~/.claude/skills/expo-building-native-ui`) for HIG-compliant patterns
- Consult the Software Mansion skill (`~/.claude/skills/swm-rn-best-practices`) for smooth, native-feeling transitions
- Consult the Callstack skill (`~/.claude/skills/callstack-rn-best-practices`) to keep complex forms at 60fps
- Use the Apple Developer MCP tools (`searchAppleDocumentation`, `fetchAppleDocumentation`) to verify HIG compliance when unsure
- Use the Expo MCP server (`search_documentation`, `read_documentation`) for current Expo API patterns
</opus_design_philosophy>

### Design Tokens Reference

Colour tokens, typography variants, layout tokens (border radius, spacing), and touch target dimensions are defined in the **Design system: Charcoal + Amber** section above. The **Visual Standards** subsection of AI Testing & Visual Quality Standards provides the complete dark/light token table with WCAG contrast requirements. This section focuses on composition patterns, motion, and medical UX principles that those sections don't cover.

### Component Composition Patterns

**Collapsible sections** (the backbone of the case form):
- Header: full-width tappable row, `theme.text` title left, chevron right
- Chevron rotates 90° on expand (Reanimated `useAnimatedStyle`)
- Content animates height from 0 (Reanimated layout animation)
- Specialty modules (SkinCancer, Breast, HandTrauma, Burns, PeripheralNerve, Lymphatic, Craniofacial, Aesthetic) get amber left border (2pt `theme.accent`)
- Standard sections (Patient Factors, Admission & Timing) do NOT get amber borders

**Selection chips:**
- Unselected: `theme.border` border, `theme.backgroundElevated` fill, `theme.textSecondary` label
- Selected: `theme.accent` border, amber 8% opacity fill, `theme.text` label
- Disabled: `theme.backgroundSecondary` fill, `theme.textTertiary` label, no border
- Pressed: opacity 0.7 on the entire chip
- Minimum effective tap zone: 44pt (extend with padding if chip renders smaller)

**CTA buttons:**
- Primary: `theme.accent` fill, `theme.buttonText` text, 56pt height, `BorderRadius.md` (14px)
- Secondary: transparent fill, `theme.accent` text, `theme.border` border
- Destructive: `theme.error` fill, white text
- Disabled: `theme.backgroundSecondary` fill, `theme.textTertiary` text

**Empty states:**
- Centered vertically in available space
- Feather icon at 48pt in `theme.textTertiary`
- Headline: `theme.text`, 17pt Semibold
- Description: `theme.textSecondary`, 15pt Regular
- Optional CTA below
- Never leave a screen blank — every empty state guides the user toward the next action

**Tappable cards:**
- `theme.backgroundElevated` fill, `theme.border` 1pt border, `BorderRadius.md` (14px)
- No shadows in dark mode — elevation through background lightening only
- Light mode: `Shadows.card` for subtle depth
- Pressed: opacity 0.7

**Form inputs:**
- `theme.backgroundElevated` fill, `theme.border` 1pt border, `BorderRadius.sm` (10px)
- Focused: `theme.accent` border (replaces default border)
- Error: `theme.error` border + error message below in `theme.error` at 13pt
- Disabled: `theme.backgroundSecondary` fill, `theme.textTertiary` text
- Height: 48pt minimum

### Animation & Motion

- **All animations on UI thread** via Reanimated `useAnimatedStyle` / `withTiming` / `withSpring` — never JS-thread `Animated.timing`
- **CollapsibleFormSection expansion:** `withTiming(height, { duration: 250, easing: Easing.out(Easing.cubic) })` — fast enough to not block workflow, slow enough to track visually
- **Chip selection:** instant border/fill change, no animation delay — speed matters for multi-select workflows
- **Page transitions:** use React Navigation native stack transitions, don't custom-animate navigation
- **Loading states:** subtle opacity pulse (0.3 → 0.7 → 0.3) on skeleton views, never spinners for < 2s waits
- **LayoutAnimation:** always call `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)` before the state update that triggers the layout change
- **Respect `reduceMotion`:** check `AccessibilityInfo.isReduceMotionEnabled`, replace animations with instant state changes
- **FAB animation:** speed dial fan-out uses `withSpring` for natural deceleration on mini-FAB positions

### Medical UX Rules

These override any generic design pattern:

1. **Never use colour alone for status.** Every status indicator must pair colour with a text label or icon. A surgeon with colour vision deficiency must understand case status at a glance.
2. **Auto-save aggressively.** Case form data saves to local draft on every field blur. Losing a half-entered case because the app was backgrounded is unacceptable. `useCaseDraft` handles debounced + AppState background flush.
3. **Confirm destructive actions.** Delete case, discard changes, sign out — all require explicit confirmation with a clear description of what will be lost.
4. **No surprise data loss.** If navigating away from an unsaved form, show a discard confirmation. If a network request fails, queue it for retry, don't silently drop it.
5. **Structured data only.** No free-text fields for clinical data that needs to be queryable. Every picker, chip, and toggle produces structured, exportable data. Free text is the enemy of audit and research.
6. **Progressive disclosure over scrolling.** Collapse sections that aren't relevant. A hand trauma case should never show breast fields. Module visibility is data-driven via `getModuleVisibility()` in `client/lib/moduleVisibility.ts`.
7. **Sub-60-second happy path.** An uncomplicated case (BCC excision, simple fracture) must be loggable in under 60 seconds. Count taps during testing — if a common case needs more than 12 taps, the flow needs simplification.

### Screenshot Evaluation Priority

When taking and analysing screenshots during visual QA, triage findings by severity:

1. **Broken** — Layout overflow, cut-off text, overlapping elements, blank screens. **Fix immediately.**
2. **Wrong** — Incorrect colours (amber where it shouldn't be, raw hex instead of theme token), wrong font weight, missing borders. **Fix immediately.**
3. **Uncomfortable** — Touch targets < 44pt, elements too close together (< 8pt), text below 12pt. **Fix in current session.**
4. **Inconsistent** — Spacing not on 8pt grid, mixed border radii, inconsistent card styles across screens. **Log for batch fix.**
5. **Unpolished** — Missing empty states, abrupt transitions, no loading states, placeholder text. **Note for polish pass.**
