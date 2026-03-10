# CLAUDE.md — Opus (Surgical Case Logbook)

## Project overview

**Opus** is a full-stack Expo/React Native surgical case logbook app for documenting surgical procedures, tracking post-operative outcomes, and generating analytics. Privacy-first design with on-device encrypted storage and E2EE scaffolding. Integrates RACS MALT fields for Australian surgical audit compliance.

Key capabilities: multi-specialty case logging, SNOMED CT coded diagnoses and procedures, free flap and anastomosis documentation, wound episode tracking, infection monitoring, treatment episodes, hand trauma workflow, multi-lesion sessions, procedure outcomes, app lock (PIN/biometric), favourites/recents, and data export (CSV/FHIR).

### Brand identity

- **Name:** Opus — used in all UI, emails, App Store listing
- **Mark:** The Interrupted Circle — open-arc SVG stroke rendered by `OpusMark` (`client/components/brand/OpusMark.tsx`)
- **Logo:** Horizontal lockup — mark left of "opus" wordmark via `OpusLogo` (`client/components/brand/OpusLogo.tsx`)
- **Canonical amber:** `#E5A00D` (golden amber). NOT `#D97706`.
- **App icons:** `client/assets/icons/app/opus-icon-1024.png` (dark bg), `opus-icon-light-1024.png` (light bg)

### v2.0 overhaul status

- **Phase 1 COMPLETE** — Form state refactor (useReducer, split context, section components, clear/reset)
- **Phase 2 COMPLETE** — Charcoal+Amber theme, card-based diagnosis groups, section nav, summary view, reordering, specialty modules
- **Acute Hand Category COMPLETE** — 3-way hand surgery branching (Trauma/Acute/Elective), 13 curated acute diagnoses with chip-based progressive disclosure, hand infection 4-layer inline assessment (type/digits/organism/antibiotic/severity/Kanavel), infection-to-overlay bridge, accept-mapping flow with coding details, dashboard attention surfacing for severe hand infections, CSV/FHIR export of hand infection data, 42 infection tests
- **Phase 3 COMPLETE** — Inline validation, keyboard optimisation (react-native-keyboard-controller), haptic audit (244 occurrences across 57 files), duplicate case, testing (Vitest), favourites/recents (DiagnosisPicker + ProcedureSubcategoryPicker chips, recording on save)
- **Phase 4 COMPLETE** — Data migration (schemaVersion 4, lazy on load), CSV export (38 columns), FHIR R4 export (with Device resources for implants), PDF export (with implant column), analytics dashboard (base stats + specialty-specific stats + entry time + suggestion acceptance + top dx-proc pairs)
- **Elective Hand + Joint Implant COMPLETE** — 38 elective hand diagnoses across 7 subcategories with strict elective-only picker scoping and SNOMED fallback, 11 new procedures (3 arthroplasty with `hasImplant` flag), 3 staging configs (Tubiana-Dupuytren, CTS-Severity, Quinnell-Trigger), HandElectivePicker chip-based UI, per-procedure JointImplantSection workflow with digit/laterality anatomy capture and completeness warnings, 26 implant catalogue entries for CMC1/PIP/MCP, multi-implant aggregation in CSV/FHIR/PDF exports, expanded CaseDetailScreen implant display, duplicate case cloning, and 99 tests (52 elective hand + 44 implant + 3 export)
- **Skin Cancer Terminology Repair COMPLETE** — corrected skin-cancer SNOMED CT parent/subtype diagnoses, rare malignancy runtime metadata, melanoma staging lookups, UK-extension skin oncology procedure codes, and Mohs migration mapping; added 17 rare cutaneous subtype entries and targeted regression coverage for diagnosis resolution, staging lookup, and procedure terminology
- **Media Overhaul Phase 1-4 COMPLETE** — unified MediaTag taxonomy (64 tags across 7 groups replacing dual OperativeMediaType + MediaCategory), 7 capture protocols (free flap, skin cancer, rhinoplasty, face, breast, body contouring, hand surgery), legacy migration mappers, EXIF stripping fix (removed double-encoding), `getRelevantGroups()` diagnosis-driven skin cancer support, 5 UI components (MediaTagBadge, MediaTagPicker, ProtocolBadge, CaptureStepCard, GuidedCaptureFlow), wired into all screens (AddOperativeMediaScreen, MediaManagementScreen, OperativeMediaSection, MediaCapture, AddTimelineEventScreen), TAG_TO_MEDIA_TYPE/TAG_TO_CATEGORY backward-compat reverse mappings, CaseFormScreen/CaseDetailScreen/DashboardScreen derive and pass media context (specialty, procedureTags, hasSkinCancerAssessment), MediaCapture uses MediaTagBadge+resolveMediaTag for legacy migration, AddTimelineEventScreen hardcoded hex colours replaced with theme tokens, legacy MEDIA_CATEGORY_LABELS/MEDIA_TYPE_TO_CATEGORY/CATEGORY_TO_MEDIA_TYPE marked @deprecated
- **Media Overhaul Phase 5 COMPLETE** — temporal tag auto-suggestion (`suggestTemporalTag()` with date-range-based default tag selection, wired through CaseFormScreen → OperativeMediaSection → AddOperativeMediaScreen), DashboardScreen hardcoded hex fix (`#fff` → `theme.buttonText`), GuidedCaptureFlow error handling improvement (top-level import, console.warn), expanded test coverage (operativeMedia 2→16, mediaTagMigration 49→73, mediaCaptureProtocols 23→27), 126 media tests (487 total)
- **Phase 5 IN PROGRESS** — Version 2.0.0, EAS config done (dev/preview/production profiles), pending manual regression + TestFlight submission

## Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo | 54 |
| UI | React Native | 0.81.5 |
| React | React | 19.1.0 |
| Language | TypeScript | 5.9.2 |
| Navigation | React Navigation | 7 (@native 7.1.8, @native-stack 7.3.16, @bottom-tabs 7.4.0) |
| Server state | TanStack React Query | 5.90.7 |
| Animation | React Native Reanimated | 4.1.1 |
| Charts | React Native SVG | 15.12.1 |
| Backend | Express | 4.21.2 |
| ORM | Drizzle ORM | 0.39.3 |
| Database | PostgreSQL (pg) | 8.16.3 |
| Auth | JWT (jsonwebtoken 9.0.3) + bcryptjs 3.0.3 |
| Encryption | @noble/ciphers 2.1.1, @noble/curves 2.0.1, @noble/hashes 2.0.1 |
| Email | Resend | 4.0.0 |
| Validation | Zod | 3.25.76 (+ drizzle-zod 0.7.1) |
| Testing | Vitest | 4.0.18 |
| Build (server) | esbuild (via tsx 4.20.6 for dev) |
| Build (client) | Expo / EAS |

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
  App.tsx                        # Root: 7 nested providers → RootStackNavigator
  screens/                       # 22 screens + 9 onboarding sub-screens
    DashboardScreen.tsx           # Surgical triage surface, 4-zone layout
    CaseDetailScreen.tsx          # Full case view, timeline, flap outcomes
    CaseFormScreen.tsx            # Case entry, delegates to section components
    SettingsScreen.tsx            # Profile, export, legal, app lock config
    EditProfileScreen.tsx         # Profile editing, picture upload, facilities
    OnboardingScreen.tsx          # Multi-step onboarding coordinator
    AuthScreen.tsx                # Login/signup/password reset
    AddCaseScreen.tsx             # Case entry initiation
    AddTimelineEventScreen.tsx    # Post-op events, complications
    AddHistologyScreen.tsx        # Standalone histology entry for skin cancer cases
    AddOperativeMediaScreen.tsx   # Intraoperative image capture + metadata annotation
    MediaManagementScreen.tsx     # Batch media upload/editor with save-discard guard
    ManageFacilitiesScreen.tsx    # Facility CRUD
    SetupAppLockScreen.tsx        # PIN setup, biometric config
    LockScreen.tsx                # PIN/biometric unlock with auto Face ID prompt on resume
    PersonalisationScreen.tsx     # Theme, keyboard prefs, export format
    SurgicalPreferencesScreen.tsx # Role, supervision, RACS MALT settings
    EpisodeListScreen.tsx         # Treatment episode list
    EpisodeDetailScreen.tsx       # Episode view with linked cases
    CaseSearchScreen.tsx          # Global case search with filters
    StatisticsScreen.tsx          # 3-tier analytics: career overview, specialty deep-dives, operational insights
    NeedsAttentionListScreen.tsx  # Full-screen needs attention list with sections
    onboarding/                   # 9 files: Welcome, FeaturePager, Auth, EmailSignup,
                                  #   Categories, Training, Hospital, Privacy, FeatureSlide
  components/                    # 120+ files across 13 subdirectories
    case-form/                   # 10 section components (see "Case form" below)
    dashboard/                   # 10 files — dashboard v2 components (see "Dashboard redesign")
    statistics/                  # 6 files — BarChart, HorizontalBarChart, StatCard, MilestoneTimeline, SpecialtyDeepDiveCard, EmptyStatistics
    hand-trauma/                 # 15 files — unified hand trauma assessment
    hand-infection/              # HandInfectionCard — 4-layer progressive disclosure
    hand-elective/               # HandElectivePicker — chip-based elective hand diagnosis selector
    acute-hand/                  # AcuteHandAssessment + AcuteHandSummaryPanel
    joint-implant/               # JointImplantSection — 3-layer progressive disclosure implant tracking
    skin-cancer/                 # 14 files — inline skin cancer assessment module
    media/                       # 5 files — MediaTagBadge, MediaTagPicker, ProtocolBadge, CaptureStepCard, GuidedCaptureFlow
    detail-sheets/               # 7 bottom-sheet detail views
    brand/                       # OpusMark, OpusLogo, index
    onboarding/                  # StepHeader, StepIndicator
    [50+ top-level components]   # Forms, editors, badges, media, layout
  contexts/
    AuthContext.tsx               # Auth state, profile, facilities, device keys
    CaseFormContext.tsx           # Split: CaseFormStateContext + CaseFormDispatchContext
    AppLockContext.tsx            # PIN/biometric lock state, auto-lock timeout, re-lock handling
    MediaCallbackContext.tsx      # Attachment callbacks for MediaManagement + generic callbacks
  hooks/
    useCaseForm.ts               # useReducer form state, 15+ actions (1703 lines)
    useCaseDraft.ts              # Auto-save drafts (debounced + AppState flush)
    useFavouritesRecents.ts      # Recent/favourite diagnosis-procedure pairs
    useTheme.ts                  # ThemeProvider, system/light/dark, AsyncStorage
    useActiveEpisodes.ts         # Query hook for active episodes
    useScreenOptions.ts          # Shared navigation header options
    useColorScheme.ts            # System colour scheme detection
    useStatistics.ts             # Memoized statistics computation from cases (career, free flap, specialty, operational, milestones)
    useAttentionItems.ts         # Shared selector wrapper for dashboard attention items
    usePracticePulse.ts          # Shared selector wrapper for thisMonth/thisWeek/completion metrics
    useDecryptedImage.ts         # Decrypt-on-demand hook for v2 encrypted media (file URI cache)
  lib/
    storage.ts                   # AsyncStorage CRUD, encryption, drafts, case index
    dashboardSelectors.ts        # Shared dashboard selector layer (counts, filters, attention items, pulse, quick-log params)
    procedurePicklist.ts         # 500+ procedures across 12 specialties
    statistics.ts                # Case analytics, filtering, calculations (specialty-scoped + free-flap analytics)
    statisticsHelpers.ts         # Career overview, monthly volume, operational insights, milestones, specialty insights (454 lines)
    handTraumaDiagnosis.ts       # MachineSummary + deterministic rendering (1570 lines)
    handTraumaMapping.ts         # Trauma → diagnosis-procedure pairs (1862 lines)
    handTraumaUx.ts              # Hand trauma UX helpers
    aoToDiagnosisMapping.ts      # AO code → diagnosis mapping
    encryption.ts                # XChaCha20-Poly1305 AEAD, envelope format, master key export
    mediaEncryption.ts           # AES-256-GCM primitives, per-image DEK, DEK wrap/unwrap
    mediaFileStorage.ts          # File-system CRUD for v2 encrypted media (opus-media:{uuid})
    mediaDecryptCache.ts         # LRU temp-file cache for decrypted v2 media
    thumbnailGenerator.ts        # Thumbnail + full image byte extraction, EXIF stripping via re-encoding (300px/0.6)
    mediaTagMigration.ts         # Legacy OperativeMediaType/MediaCategory → MediaTag mappers, resolveMediaTag(), suggestTemporalTag()
    mediaMigration.ts            # Lazy v1→v2 media migration with deferred cleanup
    binaryUtils.ts               # Shared base64↔Uint8Array conversion utilities
    e2ee.ts                      # Device key pair generation, X25519
    auth.ts                      # JWT token management, device key registration
    query-client.ts              # TanStack React Query + API base URL
    snomedCt.ts                  # SNOMED code picklists, country code mappings
    snomedApi.ts                 # Ontoserver FHIR client for live search
    snomedCodeMigration.ts       # Old→new SNOMED code mapping
    migration.ts                 # Auto-migrate old case formats on load
    migrationValidator.ts        # Migration validation
    mediaStorage.ts              # Encrypted media routing (v1 AsyncStorage + v2 file-based) + URI-based import
    dateValues.ts                # Safe YYYY-MM-DD parsing/formatting (local-noon semantics)
    caseDraftFields.ts           # Draft procedure-date/media restore helpers
    operativeMedia.ts            # MediaAttachment <> OperativeMediaItem mapping + TAG_TO_MEDIA_TYPE/TAG_TO_CATEGORY reverse maps
    melanomaStaging.ts           # Breslow/Clark/TNM staging rules
    procedureConfig.ts           # Specialty-specific form field config
    export.ts                    # Case export orchestration
    exportCsv.ts                 # CSV formatter
    exportFhir.ts                # FHIR formatter
    exportPdf.ts                 # PDF formatter (expo-print + expo-sharing)
    episodeStorage.ts            # Episode CRUD
    episodeSync.ts               # Episode server sync
    episodeHelpers.ts            # Episode state machine validation
    outcomeSync.ts               # Flap outcome syncing
    appLockStorage.ts            # PIN hashing, biometric prefs
    biometrics.ts                # Biometric capability detection
    facilities.ts                # Facility lookup, normalization
    personalization.ts           # Specialty/training/hospital selection
    onboarding.ts                # Onboarding flow state
    caseDiagnosisSummary.ts      # Case title generation
    moduleSummary.ts             # Module-specific summary rendering
    moduleVisibility.ts          # Conditional module visibility
    flapOutcomeDefaults.ts       # Default flap outcome values
    skinCancerDiagnoses.ts       # Skin cancer SNOMED taxonomy + rare subtype matching
    skinCancerConfig.ts          # Activation, pathway logic, margins, rare subtype metadata, SLNB, diagnosis resolution, procedure suggestions
    skinCancerEpisodeHelpers.ts  # Episode link/update plans + follow-up transforms
    handInfectionBridge.ts       # HandInfectionDetails ↔ InfectionOverlay bridge functions
    diagnosisPicklists/          # 12 specialty picklists + lazy-loaded index
      index.ts                   # getDiagnosesForProcedure, reverse mapping
      {specialty}Diagnoses.ts    # Per-specialty (aesthetics, bodyContouring, breast,
                                 #   burns, cleftCranio, general, handSurgery, headNeck,
                                 #   lymphoedema, orthoplastic, peripheralNerve, skinCancer)
    __tests__/                   # 22 test files incl. hand trauma, skin cancer, dashboard, dateValues, operative media, statistics, hand elective, joint implant, mediaEncryption, staging/terminology regressions, mediaTagMigration, mediaCaptureProtocols
  types/
    case.ts                      # Case, DiagnosisGroup, Procedure, Timeline, Media (2322 lines)
    media.ts                     # MediaTag taxonomy (64 tags, 7 groups), MEDIA_TAG_REGISTRY, getTagsForGroup, getRelevantGroups
    diagnosis.ts                 # Diagnosis picklist entry
    episode.ts                   # Treatment episode, status machine, encounter classes
    infection.ts                 # Infection episodes, syndromes, microbiology
    handInfection.ts             # HandInfectionDetails, 4-layer assessment, label maps, bridge helpers
    wound.ts                     # Wound assessment, TIME, dressings (40+ products)
    skinCancer.ts                # Assessment, histology, pathology, SLNB, lesion photos (629 lines)
    jointImplant.ts              # JointImplantDetails, implant catalogue entry, size configs, label maps
    skinCancerStagingConfigs.ts  # Breslow, Clark, TNM configs
    surgicalPreferences.ts       # Training programme, role defaults, protocols
  constants/
    theme.ts                     # Charcoal+Amber design tokens (single source of truth)
    categories.ts                # Specialty labels
    procedureCategories.ts       # Procedure category options
    hospitals.ts                 # Facility master data
    trainingProgrammes.ts        # Training programme options
    onboardingCopy.ts            # Onboarding text strings
  data/
    aoHandClassification.ts      # AO hand trauma codes
    aoToSnomedMapping.ts         # AO → SNOMED mapping
    autoFillMappings.ts          # Auto-fill field mappings
    facilities.ts                # Master facility database
    flapFieldConfig.ts           # Flap-specific form configs (~100 typed fields)
    handInfectionClinicalData.ts # Kanavel signs, organism presets, antibiotic defaults
    implantCatalogue.ts          # 26 joint implant entries (CMC1/PIP/MCP systems)
    mediaCaptureProtocols.ts     # 7 specialty capture protocols, findProtocols(), mergeProtocols()
  navigation/
    RootStackNavigator.tsx       # Auth → Onboarding → Main, modal stack
    MainTabNavigator.tsx         # Bottom tabs: Dashboard + Statistics + Settings
    DashboardStackNavigator.tsx  # Dashboard → Case Detail → Add Case
    StatisticsStackNavigator.tsx # Statistics tab stack
    SettingsStackNavigator.tsx   # Settings → Profile → Facilities → Preferences
    OnboardingNavigator.tsx      # Welcome → Features → Auth → Categories → Training → Hospital → Privacy
  assets/
    specialty-icons.ts           # Custom SVG icon definitions for specialties
    icons/app/                   # App icons (1024px, dark + light)
    images/                      # Splash screen
server/
  index.ts                       # Express entry: security headers, CORS, body parsing (335 lines)
  routes.ts                      # 40+ API endpoints (2041 lines)
  storage.ts                     # DatabaseStorage class with ownership checks (706 lines)
  db.ts                          # Drizzle + pg Pool connection
  env.ts                         # Zod-validated environment variables
  snomedApi.ts                   # Ontoserver FHIR integration (337 lines)
  email.ts                       # Resend email service (195 lines)
  diagnosisStagingConfig.ts      # Dynamic staging form definitions
  seedData.ts                    # SNOMED reference data seed (~33KB)
  templates/                     # HTML: landing, privacy, terms, reset-password, licenses
  __tests__/                     # 3 test files (auth, validation, diagnosis staging config)
shared/
  schema.ts                      # Drizzle ORM table definitions, 14 tables (654 lines)
  professionalRegistrations.ts   # Professional registration types
migrations/                      # 3 SQL migration files
```

## Architecture

### Provider hierarchy (App.tsx)

```
ErrorBoundary → ThemeProvider → QueryClientProvider → AuthProvider
  → AppLockProvider → MediaCallbackProvider → SafeAreaProvider
    → GestureHandlerRootView → KeyboardProvider
      → ThemedNavigationContainer → RootStackNavigator
```

### Navigation flow

Auth → Onboarding → Main (bottom tabs: Dashboard, Statistics, Settings) with modal stack for case entry/detail/episodes. Headers use solid `theme.backgroundRoot` (no blur/transparency, no shadow). Configured centrally via `useScreenOptions()` (`client/hooks/useScreenOptions.ts`). Screens do NOT use `useHeaderHeight()` — `headerTransparent: false` means content starts below the header automatically.

### Data flow

- **Local cases:** Encrypted in AsyncStorage (offline-first). Draft auto-save via `useCaseDraft.ts` (debounced + AppState background flush). Server sync on explicit save via React Query mutations.
- **Form state:** `useCaseForm()` hook → `useReducer` with 15+ actions (`SET_FIELD`, `SET_FIELDS`, `RESET_FORM`, `LOAD_CASE`, `LOAD_DRAFT`, `ADD_TEAM_MEMBER`, `REMOVE_TEAM_MEMBER`, `ADD_ANASTOMOSIS`, `UPDATE_ANASTOMOSIS`, `REMOVE_ANASTOMOSIS`, `ADD_DIAGNOSIS_GROUP`, `REMOVE_DIAGNOSIS_GROUP`, `UPDATE_DIAGNOSIS_GROUP`, `REORDER_DIAGNOSIS_GROUPS`, `UPDATE_CLINICAL_DETAIL`). Split context pattern: `CaseFormStateContext` + `CaseFormDispatchContext` for memo optimization.
- **Server state:** TanStack React Query for API calls.
- **Auth state:** `AuthContext` with JWT tokens, profile, facilities, device keys.
- **Patient privacy:** Identifiers SHA-256 hashed in local case index.

### Multi-diagnosis group architecture

Each Case has `diagnosisGroups: DiagnosisGroup[]` instead of flat diagnosis/procedures fields. Each group bundles: specialty, diagnosis, staging, fractures, procedures, and optional `handInfectionDetails`. `procedureSuggestionSource` tracks origin: `"picklist"`, `"skinCancer"`, `"acuteHand"`, or `"manual"`. Enables multi-specialty cases (e.g., hand surgery + orthoplastic in one session). Old cases auto-migrated on load via `client/lib/migration.ts`. Helpers: `getAllProcedures(c)`, `getCaseSpecialties(c)`, `getPrimaryDiagnosisName(c)` in `client/types/case.ts`.

### Case form sections

`CaseFormScreen.tsx` (778 lines) delegates to section components via `CaseFormContext`:

1. `PatientInfoSection` — Demographics, ASA, smoking, BMI
2. `AdmissionSection` — Urgency, stay type, discharge outcome
3. `DiagnosisProcedureSection` — Diagnosis groups, specialty-specific UI
4. `TreatmentContextSection` — Reconstruction timing, prior radio/chemo, transfusion context for flap cases
5. `PatientFactorsSection` — Risk factors, comorbidities
6. `OperativeFactorsSection` — Surgery timing, team, anaesthesia
7. `OutcomesSection` — Complications, Clavien-Dindo, outcomes

Plus: `CollapsibleFormSection` (card wrapper), `SectionNavBar` (horizontal pill navigation), `CaseSummaryView` (read-only review gating save with validation).

Header uses a truncating centered title. Header right is compact: overflow icon for Clear/Revert + Save button. `CollapsibleFormSection` now measures closed content safely so default-collapsed sections like Treatment Context open reliably on first tap. SectionNavBar has no bottom border.

### Edit mode

- Restores `clinicalDetails`, `recipientSiteRegion`, `anastomoses` from existing case data
- Uses actual `clinicalDetails` state (not placeholder) in save payload
- Draft loading skipped in edit mode (`isEditMode` guard)
- All field setters use `?? ""` / `?? defaultValue` (unconditional) so cleared fields persist
- `handleSaveRef.current` always points to latest `handleSave` closure

## Database schema (PostgreSQL, 14 tables)

Defined in `shared/schema.ts`. All PKs are UUIDs via `gen_random_uuid()`. Cascade deletes on user deletion.

| Table | Key columns | Notes |
|-------|-------------|-------|
| `users` | id, email (unique), password (bcrypt), tokenVersion | JWT revocation via tokenVersion |
| `profiles` | userId (1:1), fullName, firstName, lastName, dateOfBirth, sex, countryOfPractice, careerStage, professionalRegistrations (JSONB), surgicalPreferences (JSONB), onboardingComplete | Verification status: unverified/pending/verified |
| `user_facilities` | userId, facilityName, facilityId, isPrimary | Index on userId |
| `user_device_keys` | userId, deviceId, publicKey (X25519), label, lastSeenAt, revokedAt | Unique (userId, deviceId) |
| `password_reset_tokens` | userId, token (unique), expiresAt, used | Single-use, 1-hour expiry |
| `teams` | name, description, ownerId | Index on ownerId |
| `team_members` | teamId, userId, role (owner/admin/member/viewer) | Indexes on teamId, userId |
| `snomed_ref` | snomedCtCode (unique), displayName, commonName, category, subcategory, anatomicalRegion, specialty, isActive, sortOrder | Indexes on category, code |
| `procedures` | userId, patientIdentifierHash, procedureDate, facility, specialty, SNOMED codes, ASA/BMI/smoker/diabetes, start/end time, registry fields | Indexes on userId, (userId, createdAt) |
| `flaps` | procedureId, SNOMED codes, side, composition, harvestTechnique, recipientSite/Region, dimensions, perforators, elevationPlane, ischemia times, registry fields | Index on procedureId |
| `anastomoses` | flapId, vesselType, recipient/donor vessel SNOMED codes, couplingMethod, couplerSize, configuration, suture details, patency | Index on flapId |
| `case_procedures` | caseId (→procedures), sequenceOrder, procedureName, specialty, SNOMED codes, surgeonRole, clinicalDetails, notes | Index on caseId |
| `treatment_episodes` | userId, encryptedData, patientIdentifierHash, status | Indexes on userId, (userId, status) |
| `procedure_outcomes` | caseProcedureId, outcomeType, assessedAt, assessedDaysPostOp, details (JSONB) | Indexes on caseProcedureId, outcomeType |

**Performance indexes** (`migrations/add_performance_indexes.sql`): 8 additional indexes on high-frequency query paths. All `IF NOT EXISTS`.

## API endpoints (server/routes.ts)

All endpoints under `/api/`. Authentication via JWT bearer token (`authenticateToken` middleware) unless noted.

### Auth (rate-limited)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Create account (email, password) |
| POST | `/auth/login` | Returns token + profile + facilities |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/refresh` | Refresh token (7-day expiry) |
| POST | `/auth/change-password` | Revokes all tokens via tokenVersion |
| POST | `/auth/request-password-reset` | Always returns success (no email leak) |
| POST | `/auth/reset-password` | Validates hashed token, single-use |
| DELETE | `/auth/account` | Cascading delete of all user data |

### Profile
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/profile` | Fetch profile (JSONB serialized) |
| PUT | `/profile` | Update profile fields |
| POST | `/profile/picture` | Avatar upload (Multer, 5MB limit) |
| DELETE | `/profile/picture` | Remove avatar |

### Facilities
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/facilities` | List user facilities |
| POST | `/facilities` | Create facility |
| PUT | `/facilities/:id` | Update isPrimary (auto-clears others) |
| DELETE | `/facilities/:id` | Delete (ownership check) |

### Device keys (E2EE)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/keys/me` | List non-revoked device keys |
| POST | `/keys/device` | Upsert device key |
| POST | `/keys/revoke` | Revoke device |

### Procedures (cases)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/procedures` | List (limit 50, offset) |
| POST | `/procedures` | Create (with optional flaps array) |
| GET | `/procedures/:id` | Fetch with flaps + anastomoses |
| PUT | `/procedures/:id` | Update |
| DELETE | `/procedures/:id` | Delete |

### Flaps
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/procedures/:procedureId/flaps` | Create flap |
| GET | `/flaps/:id` | Fetch with anastomoses |
| PUT | `/flaps/:id` | Update |
| DELETE | `/flaps/:id` | Delete |

### Anastomoses
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/flaps/:flapId/anastomoses` | Create |
| GET | `/anastomoses/:id` | Fetch |
| PUT | `/anastomoses/:id` | Update |
| DELETE | `/anastomoses/:id` | Delete |

### Treatment episodes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/episodes` | List all |
| GET | `/episodes/:id` | Fetch |
| POST | `/episodes` | Create |
| PUT | `/episodes/:id` | Update |
| DELETE | `/episodes/:id` | Delete |

### Procedure outcomes
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/procedure-outcomes` | Create |
| GET | `/procedure-outcomes/:id` | Fetch |
| PUT | `/procedure-outcomes/:id` | Update |
| DELETE | `/procedure-outcomes/:id` | Delete |

### SNOMED CT & reference data
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/snomed/procedures` | Live search via Ontoserver FHIR |
| GET | `/snomed/diagnoses` | Live search diagnoses |
| GET | `/snomed/concepts/:conceptId` | Concept details (FSN, synonyms, hierarchy) |
| GET | `/snomed-ref/vessels/:region` | Vessels by anatomical region |
| GET | `/snomed-ref/regions` | All anatomical regions |
| GET | `/snomed-ref/flap-types` | 18 free flap types |
| GET | `/snomed-ref/donor-vessels/:flapType` | Donor vessels by flap |
| GET | `/snomed-ref/compositions` | Tissue compositions |
| GET | `/snomed-ref/coupling-methods` | Anastomosis coupling methods |
| GET | `/snomed-ref/anastomosis-configs` | Anastomosis configurations |

### Staging
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/staging/diagnosis` | Staging systems for diagnosis (by SNOMED code) |
| GET | `/staging/all` | All 14 staging configurations |

### Other
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (`{ status: "ok" }`) |
| POST | `/seed-snomed-ref` | Dev-only: seed SNOMED data (env-gated) |

## Supported specialties

12 specialties defined in `client/types/case.ts`:
- Hand surgery (`hand_wrist`), Orthoplastic, Breast, Body contouring, Burns, Head & neck, Aesthetics, General
- Plus: Cleft/Craniofacial (`cleft_cranio`), Skin cancer, Lymphoedema, Peripheral nerve

Each has: dedicated diagnosis picklist, specialty colour, SVG icon, procedure subcategories.

## Key features

### Procedure picklists & SNOMED CT

490 procedures across all specialties in `client/lib/procedurePicklist.ts`. Each entry has SNOMED CT codes, specialty tags, subcategory. All specialties use the subcategory picker UI. SNOMED code migration (`client/lib/snomedCodeMigration.ts`) transparently updates old codes on load.

### Diagnosis-to-procedure suggestions

245 structured diagnoses across specialties with procedure suggestions (staging-conditional). Selecting a diagnosis auto-populates default procedures. Components: `DiagnosisPicker`, `ProcedureSuggestions`.

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
- Tests: `client/lib/__tests__/handElective.test.ts` (50 tests)

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

Tests: `client/lib/__tests__/jointImplant.test.ts` (39 tests)

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

**Diagnosis resolution** (`resolveSkinCancerDiagnosis`):**
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

Tests: `client/lib/__tests__/skinCancerConfig.test.ts` (87 tests), `skinCancerPhase4.test.ts` (11 tests), `skinCancerPhase5.test.ts` (18 tests). Total focused skin-cancer suite: **116 tests**.

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

### Wound episode tracker

Serial wound assessment as timeline event type (`wound_assessment`). `WoundAssessmentForm` with 11 sections: dimensions (auto-area), TIME classification, surrounding skin, dressing catalogue (40+ products), healing trend, intervention notes, next review. `WoundDimensionChart` SVG line chart for wound area over time.

### Infection documentation

`InfectionOverlayForm` attachable to any specialty. Quick templates (Abscess, NecFasc, Implant Infection), infection syndromes (Skin/Soft Tissue, Deep, Bone/Joint), serial episode tracking, microbiology data with resistance flags. Dashboard shows active infection cases with statistics.

### Treatment episodes

Serial case tracking via `treatment_episodes` table. Episode status machine: planned → active ⇄ on_hold → completed. 7 episode types, 4 encounter classes, 9 pending actions. Types in `client/types/episode.ts`. UI: `EpisodeListScreen`, `EpisodeDetailScreen`, `InlineEpisodeCreator`, `EpisodeLinkBanner`.

### Dashboard v2 (COMPLETE)

The dashboard is a **surgical triage surface** — density-first, optimised for 5–10 second scan sessions. All 5 phases + post-launch refinements complete.

#### Locked architectural decisions

| Decision | Locked value |
|----------|-------------|
| Dashboard philosophy | Density-first. NOT clarity-first, NOT feed-first. |
| Zone order (top→bottom) | Filter Bar → Needs Attention → Practice Pulse → Recent Cases |
| Primary action | FAB (bottom-right, 56px, amber). NOT a header button. |
| Header | Centered `HeaderTitle` lockup (Opus logo + subtitle). Search button on the right. NO greeting. |
| Statistics | Numbers + deltas only on dashboard. NO charts. Charts live on the dedicated Statistics tab. |
| Notifications | Zone 1 presence/absence IS the notification. NO red dots, NO badge counts. |
| Customisation | None. One excellent default. Specialty filter is the only personalisation. |
| Zone 1 empty behaviour | Returns `null`. NOT an empty View, NOT a placeholder. Zone does not exist when 0 items. |

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
  AddCaseFAB.tsx                # Floating action button overlay
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
    <SpecialtyFilterBar />          {/* index 0 — sticky */}
    <NeedsAttentionCarousel />      {/* null when 0 items */}
    <PracticePulseRow />            {/* null when 0 total cases */}
    <RecentCasesList />             {/* or DashboardEmptyState */}
  </ScrollView>
  <AddCaseFAB />                    {/* position: absolute, outside ScrollView */}
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

CSV (`exportCsv.ts`, 38 columns with primary dx/proc dedicated columns, semicolon-delimited secondary, 6 hand infection columns, 6 implant columns), FHIR R4 (`exportFhir.ts`, full Bundle with Condition, Procedure, Encounter, Device resources), and PDF (`exportPdf.ts`, HTML-to-PDF via expo-print with implant column, shared via expo-sharing). Export orchestration in `export.ts`. Configurable via `PersonalisationScreen`.

### Procedure outcomes

Polymorphic outcome tracking via `procedure_outcomes` table (JSONB `details` field). Outcome types are flexible. Linked to `case_procedures`. Synced via `outcomeSync.ts`.

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

| Component | Purpose |
|-----------|---------|
| `BarChart` | Animated SVG vertical bar chart (react-native-reanimated). Plays animation once only (useRef guard). Short labels for >6 bars. |
| `HorizontalBarChart` | View-based horizontal bars with labels, values, and overflow count. `ellipsizeMode="tail"` on labels. |
| `StatCard` | Themed metric card with label, value, optional subtitle. |
| `MilestoneTimeline` | Vertical timeline with dots, lines, ordinal labels, date formatting with crash guard. Default 8 visible with "See all" expand. |
| `SpecialtyDeepDiveCard` | Collapsible card per specialty with chevron toggle and specialty colour accent. |
| `EmptyStatistics` | Zero-case empty state with illustration and prompt. |

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

| Diagnosis | Recommended margin |
|-----------|-------------------|
| Melanoma in situ | 5mm (NCCN/ESMO) |
| Melanoma ≤1.0mm | 1cm |
| Melanoma 1.01–2.0mm | 1–2cm |
| Melanoma >2.0mm | 2cm |
| BCC | 3–4mm (or Mohs) |
| SCC low-risk | 4–6mm |
| SCC high-risk | 6–10mm |

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

| Purpose | File |
|---------|------|
| Assessment component | `client/components/skin-cancer/SkinCancerAssessment.tsx` (analogous to `hand-trauma/HandTraumaAssessment.tsx`) |
| Type definitions | `client/types/skinCancer.ts` (extend existing) |
| Mapping/config | `client/lib/skinCancerConfig.ts` (margin recommendations, SLNB criteria, disclosure rules) |
| Integration point | `DiagnosisGroupEditor.tsx` activates the module when diagnosis metadata matches |
| Tests | `client/lib/__tests__/skinCancerAssessment.test.ts` for disclosure logic, margin recommendations, episode auto-creation |

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

**Architecture:** Per-image DEK model with file-system storage. Each photo gets a random 256-bit DEK, encrypted via AES-256-GCM (`@noble/ciphers`). The DEK is wrapped with the master key (AES-256-GCM) and stored in plaintext `meta.json`. Cipher provider isolated in `mediaEncryption.ts` for future swap to native `react-native-aes-gcm-crypto` if profiling warrants it.

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
- Decrypted temp files cleared on every app background transition (regardless of app lock config)
- Thumbnails encrypted (v1 stored unencrypted — v2 fixes this gap)
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
- **Version:** 2.0.0, buildNumber 4
- **New Architecture:** enabled
- **React Compiler:** enabled (experimental)

### Environment variables
| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Min 32 characters |
| `PORT` | Yes | Use 5001 locally (5000 conflicts with AirPlay) |
| `NODE_ENV` | No | development/production/test (default: development) |
| `RESEND_API_KEY` | No | For email functionality |
| `APP_DOMAIN` | No | Override app domain for emails |
| `ENABLE_SEED` | No | Gate SNOMED seed endpoint (dev only) |
| `SEED_TOKEN` | No | Token for seed endpoint |

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
- **TanStack React Query** for server state
- **Zod + drizzle-zod** for validation at API boundaries
- **React Native primitives** (View, Text, ScrollView) — no third-party UI kit
- **@noble/*** for cryptographic operations (not Web Crypto)
- **No hardcoded colours** — always `theme.*` or `palette.*` from `client/constants/theme.ts`
- **Ownership verification** at every API level — IDOR-safe
- **Split context pattern** — state and dispatch contexts separated for memo optimization
- **Unconditional field setters** (`?? ""`) to ensure cleared fields persist
- **Header save ref pattern** — `handleSaveRef.current` always latest closure
- **Encrypted URIs** — `opus-media:{uuid}` (v2 file-based) and `encrypted-media:{uuid}` (v1 legacy) schemes for media references
- **Draft auto-save** — debounced + AppState background flush

## Testing

- **Framework:** Vitest 4.0.18, **487 tests** across 24 files
- **Client tests:** `client/lib/__tests__/` — handTraumaDiagnosis, handTraumaMapping, handTraumaUx, skinCancerConfig (89 tests), skinCancerPhase4 (11 tests), skinCancerPhase5 (18 tests), dashboardSelectors (7 tests), handInfection (42 tests), handElective (52 tests), jointImplant (44 tests), mediaEncryption (16 tests), statisticsHelpers (3 tests), statistics (7 tests), dateValues (8 tests), operativeMedia (16 tests), caseDraftPersistence (1 test), mediaTagMigration (73 tests), mediaCaptureProtocols (27 tests), implantExport (3 tests), dateFieldNormalization (4 tests), skinCancerDiagnoses (7 tests)
- **Server tests:** `server/__tests__/` — auth (17 tests), validation (7 tests), diagnosisStagingConfig (3 tests)
- **Run:** `npm run test` (once) or `npm run test:watch` (watch mode)
