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
- **Phase 2.5 COMPLETE** — Skin cancer inline assessment module (14 components, 104 tests, pathway logic, margin CDS, SLNB, procedure suggestions with coverage, collapsible sections)
- **Phase 3 NEXT** — Favourites/recents (partially done), inline validation, keyboard optimisation, haptic audit, duplicate case
- **Phase 4** — Data migration, export formatting, analytics dashboard
- **Phase 5** — TestFlight release

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
  screens/                       # 18 screens + 9 onboarding sub-screens
    DashboardScreen.tsx           # Case list, filtering, statistics, inpatients (2636 lines)
    CaseDetailScreen.tsx          # Full case view, timeline, flap outcomes (2660 lines)
    CaseFormScreen.tsx            # Case entry, delegates to section components (774 lines)
    SettingsScreen.tsx            # Profile, export, legal, app lock config (1558 lines)
    EditProfileScreen.tsx         # Profile editing, picture upload, facilities
    OnboardingScreen.tsx          # Multi-step onboarding coordinator
    AuthScreen.tsx                # Login/signup/password reset
    AddCaseScreen.tsx             # Case entry initiation
    AddTimelineEventScreen.tsx    # Post-op events, complications
    AddOperativeMediaScreen.tsx   # Intraoperative image capture
    MediaManagementScreen.tsx     # Batch media upload
    ManageFacilitiesScreen.tsx    # Facility CRUD
    SetupAppLockScreen.tsx        # PIN setup, biometric config
    LockScreen.tsx                # PIN/biometric unlock
    PersonalisationScreen.tsx     # Theme, keyboard prefs, export format
    SurgicalPreferencesScreen.tsx # Role, supervision, RACS MALT settings
    EpisodeListScreen.tsx         # Treatment episode list
    EpisodeDetailScreen.tsx       # Episode view with linked cases
    onboarding/                   # 9 files: Welcome, FeaturePager, Auth, EmailSignup,
                                  #   Categories, Training, Hospital, Privacy, FeatureSlide
  components/                    # 106 files across 7 subdirectories
    case-form/                   # 10 section components (see "Case form" below)
    hand-trauma/                 # 15 files — unified hand trauma assessment
    skin-cancer/                 # 14 files — inline skin cancer assessment module
    detail-sheets/               # 7 bottom-sheet detail views
    brand/                       # OpusMark, OpusLogo, index
    onboarding/                  # StepHeader, StepIndicator
    [50 top-level components]    # Forms, editors, badges, media, layout
  contexts/
    AuthContext.tsx               # Auth state, profile, facilities, device keys
    CaseFormContext.tsx           # Split: CaseFormStateContext + CaseFormDispatchContext
    AppLockContext.tsx            # PIN/biometric lock state, auto-lock timeout
    MediaCallbackContext.tsx      # Cross-screen media selection callbacks
  hooks/
    useCaseForm.ts               # useReducer form state, 15+ actions (1697 lines)
    useCaseDraft.ts              # Auto-save drafts (debounced + AppState flush)
    useFavouritesRecents.ts      # Recent/favourite diagnosis-procedure pairs
    useTheme.ts                  # ThemeProvider, system/light/dark, AsyncStorage
    useActiveEpisodes.ts         # Query hook for active episodes
    useScreenOptions.ts          # Shared navigation header options
    useColorScheme.ts            # System colour scheme detection
  lib/
    storage.ts                   # AsyncStorage CRUD, encryption, drafts, case index
    procedurePicklist.ts         # 413 procedures across 12 specialties (5443 lines)
    statistics.ts                # Case analytics, filtering, calculations (1053 lines)
    handTraumaDiagnosis.ts       # MachineSummary + deterministic rendering (1570 lines)
    handTraumaMapping.ts         # Trauma → diagnosis-procedure pairs (1862 lines)
    handTraumaUx.ts              # Hand trauma UX helpers
    aoToDiagnosisMapping.ts      # AO code → diagnosis mapping
    encryption.ts                # XChaCha20-Poly1305 AEAD, envelope format
    e2ee.ts                      # Device key pair generation, X25519
    auth.ts                      # JWT token management, device key registration
    query-client.ts              # TanStack React Query + API base URL
    snomedCt.ts                  # SNOMED code picklists, country code mappings
    snomedApi.ts                 # Ontoserver FHIR client for live search
    snomedCodeMigration.ts       # Old→new SNOMED code mapping
    migration.ts                 # Auto-migrate old case formats on load
    migrationValidator.ts        # Migration validation
    mediaStorage.ts              # Encrypted media AsyncStorage CRUD
    melanomaStaging.ts           # Breslow/Clark/TNM staging rules
    procedureConfig.ts           # Specialty-specific form field config
    export.ts                    # Case export orchestration
    exportCsv.ts                 # CSV formatter
    exportFhir.ts                # FHIR formatter
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
    skinCancerDiagnoses.ts       # Skin cancer picklist
    skinCancerConfig.ts          # Activation, pathway logic, margins, SLNB, procedure suggestions (965 lines)
    skinCancerEpisodeHelpers.ts  # Episode auto-creation for pending lesions
    diagnosisPicklists/          # 12 specialty picklists + lazy-loaded index
      index.ts                   # getDiagnosesForProcedure, reverse mapping
      {specialty}Diagnoses.ts    # Per-specialty (aesthetics, bodyContouring, breast,
                                 #   burns, cleftCranio, general, handSurgery, headNeck,
                                 #   lymphoedema, orthoplastic, peripheralNerve, skinCancer)
    __tests__/                   # 6 test files (handTrauma ×3, skinCancer ×3)
  types/
    case.ts                      # Case, DiagnosisGroup, Procedure, Timeline, Media (2322 lines)
    diagnosis.ts                 # Diagnosis picklist entry
    episode.ts                   # Treatment episode, status machine, encounter classes
    infection.ts                 # Infection episodes, syndromes, microbiology
    wound.ts                     # Wound assessment, TIME, dressings (40+ products)
    skinCancer.ts                # Assessment, histology, pathology, SLNB, lesion photos (647 lines)
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
  navigation/
    RootStackNavigator.tsx       # Auth → Onboarding → Main, modal stack
    MainTabNavigator.tsx         # Bottom tabs: Dashboard + Settings
    DashboardStackNavigator.tsx  # Dashboard → Case Detail → Add Case
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
  __tests__/                     # 2 test files (auth, validation)
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

Auth → Onboarding → Main (bottom tabs: Dashboard, Settings) with modal stack for case entry/detail/episodes. Headers use solid `theme.backgroundRoot` (no blur/transparency, no shadow). Configured centrally via `useScreenOptions()` (`client/hooks/useScreenOptions.ts`). Screens do NOT use `useHeaderHeight()` — `headerTransparent: false` means content starts below the header automatically.

### Data flow

- **Local cases:** Encrypted in AsyncStorage (offline-first). Draft auto-save via `useCaseDraft.ts` (debounced + AppState background flush). Server sync on explicit save via React Query mutations.
- **Form state:** `useCaseForm()` hook → `useReducer` with 15+ actions (`SET_FIELD`, `SET_FIELDS`, `RESET_FORM`, `LOAD_CASE`, `LOAD_DRAFT`, `ADD_TEAM_MEMBER`, `REMOVE_TEAM_MEMBER`, `ADD_ANASTOMOSIS`, `UPDATE_ANASTOMOSIS`, `REMOVE_ANASTOMOSIS`, `ADD_DIAGNOSIS_GROUP`, `REMOVE_DIAGNOSIS_GROUP`, `UPDATE_DIAGNOSIS_GROUP`, `REORDER_DIAGNOSIS_GROUPS`, `UPDATE_CLINICAL_DETAIL`). Split context pattern: `CaseFormStateContext` + `CaseFormDispatchContext` for memo optimization.
- **Server state:** TanStack React Query for API calls.
- **Auth state:** `AuthContext` with JWT tokens, profile, facilities, device keys.
- **Patient privacy:** Identifiers SHA-256 hashed in local case index.

### Multi-diagnosis group architecture

Each Case has `diagnosisGroups: DiagnosisGroup[]` instead of flat diagnosis/procedures fields. Each group bundles: specialty, diagnosis, staging, fractures, and procedures. Enables multi-specialty cases (e.g., hand surgery + orthoplastic in one session). Old cases auto-migrated on load via `client/lib/migration.ts`. Helpers: `getAllProcedures(c)`, `getCaseSpecialties(c)`, `getPrimaryDiagnosisName(c)` in `client/types/case.ts`.

### Case form sections

`CaseFormScreen.tsx` (774 lines) delegates to section components via `CaseFormContext`:

1. `PatientInfoSection` — Demographics, ASA, smoking, BMI
2. `AdmissionSection` — Urgency, stay type, discharge outcome
3. `DiagnosisProcedureSection` — Diagnosis groups, specialty-specific UI
4. `TreatmentContextSection` — Episode linking, PROM
5. `PatientFactorsSection` — Risk factors, comorbidities
6. `OperativeFactorsSection` — Surgery timing, team, anaesthesia
7. `OutcomesSection` — Complications, Clavien-Dindo, outcomes

Plus: `CollapsibleFormSection` (card wrapper), `SectionNavBar` (horizontal pill navigation), `CaseSummaryView` (read-only review gating save with validation).

Header right shows "Clear"/"Revert" text button (gray, confirmation dialog) + "Save" (amber). SectionNavBar has no bottom border.

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

413 procedures across all specialties in `client/lib/procedurePicklist.ts` (5443 lines). Each entry has SNOMED CT codes, specialty tags, subcategory. All specialties use the subcategory picker UI. SNOMED code migration (`client/lib/snomedCodeMigration.ts`) transparently updates old codes on load.

### Diagnosis-to-procedure suggestions

161+ structured diagnoses across specialties with procedure suggestions (staging-conditional). Selecting a diagnosis auto-populates default procedures. Components: `DiagnosisPicker`, `ProcedureSuggestions`.

### Procedure-first (reverse) entry

When procedures are picked without a diagnosis, a "What's the diagnosis?" card appears with smart suggestions via reverse-mapping. Built lazily in `client/lib/diagnosisPicklists/index.ts` (`getDiagnosesForProcedure`). UI: `DiagnosisSuggestions.tsx` wired into `DiagnosisGroupEditor.tsx`.

### Unified hand trauma workflow

Single inline `HandTraumaAssessment` (`client/components/hand-trauma/HandTraumaAssessment.tsx`) inside `DiagnosisGroupEditor`. For `hand_wrist` specialty, user must choose Trauma vs Elective before any diagnosis UI appears.

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

### Skin cancer assessment module

Inline assessment flow (mirrors hand trauma pattern — no modal, no separate screen) with 14 components in `client/components/skin-cancer/`, config logic in `client/lib/skinCancerConfig.ts` (965 lines), and types in `client/types/skinCancer.ts` (647 lines).

**Two pathways:**
- **Excision biopsy** — lesion not yet diagnosed. Biopsy method chips (Excision / Incisional / Shave / Punch), conditional fields (peripheral margin for excision, punch size for punch), then accept mapping.
- **Histology known** — prior biopsy result available. Tier 2 pathology details, excision method (WLE / Mohs), margin inputs (hidden for Mohs), SLNB assessment, site-specific reconstruction, then accept mapping.

**Progressive disclosure sections (numbered, collapsible SectionWrapper cards):**
1. **Diagnosis** — 7 Tier 1 pathology category chips (BCC, SCC, Melanoma, MCC, Other malig., Benign, Uncertain). Auto-collapses after selection. Switching categories resets all pathway-specific fields but preserves location data.
2. **Pathology** — Tier 2 type-specific fields per category: BCC subtypes (9), SCC differentiation/risk/depth, Melanoma subtype/Breslow/ulceration/Clark/TNM staging, MCC, rare subtypes (26 via `RareTypeSubtypePicker`). Excision method + margin fields. Collapsible, default collapsed.
3. **Lesion details** — Site picker (grouped HEAD & NECK / TRUNK / UPPER LIMB / LOWER LIMB), laterality (auto-midline for midline sites), clinical dimensions (length × width mm), lesion photo capture with auto-captioning.
4. **Margin recommendation badge** — Guideline-based CDS (NCCN melanoma Breslow tiers, BAD BCC/SCC, EXPERT rare types — e.g. DFSP 30mm, EMPD 50mm).
5. **SLNB** — Auto-offered for melanoma >0.8mm Breslow OR ulcerated, Merkel cell, high-risk SCC. Manual toggle for marginal cases. Site, nodes retrieved, result (pending → negative / positive ITC/micro/macro).
6. **Excision** — Method chips (WLE / Mohs), peripheral margin input. Margin fields hidden when Mohs selected. In biopsy pathway shows biopsy method + punch size instead.
7. **Summary & Procedures** — Headline + key facts + suggested procedure IDs. Accept mapping → collapses all sections except summary, populates parent's procedure list. "Edit mapping" pill to revoke acceptance and re-expand.

**Procedure suggestions** (`getSkinCancerProcedureSuggestions`): Excision type varies by category + head/neck vs body site. Coverage procedures suggested alongside excision: FTSG, STSG, local flaps (advancement, rotation, bilobed, rhomboid for H&N; rotation, transposition for body). Site-specific recon for lip/ear/eyelid. SLNB procedure when performed.

**Diagnosis resolution** (inline flow): `resolveSkinCancerDiagnosis()` maps pathology category + rare subtype → SNOMED diagnosis picklist entry. 9 cancer types with verified SNOMED CT codes in `skinCancerDiagnoses.ts`.

**Key components:**
- `SkinCancerAssessment` — main orchestrator, section collapse state management, scroll position stabilization via `scrollViewRef` + `scrollPositionRef`, LayoutAnimation transitions
- `PathologySection` — full Tier 2 pathology editor (BCC/SCC/Melanoma/MCC/Rare subfields, excision method, margins, margin status)
- `HistologySection` — simplified mode for Excision card (WLE/Mohs + margin only) or full mode (source, category, subfields, margins, lab details)
- `SkinCancerSummaryPanel` — accept/edit mapping UI with procedure chip selection
- `SectionWrapper` — shared collapsible card with controlled/uncontrolled modes, compact collapsed state, amber Feather icons
- `MarginRecommendationBadge` — guideline-based margin recommendation display
- `SLNBSection` — sentinel lymph node assessment with site/result/date capture

**Multi-lesion session:** 3-6 skin lesion excisions from one operative session as discrete entries within a single diagnosis group. `MultiLesionEditor` component with collapsible row-per-lesion UI and per-lesion pathway badges.

**Episode helpers:** `skinCancerEpisodeHelpers.ts` — auto-collect pending lesions, determine re-excision action (resolve / reexcision / none).

Tests: `client/lib/__tests__/skinCancerConfig.test.ts` (80 tests — margins, SLNB, pathway, procedures, diagnosis resolution), `skinCancerPhase4.test.ts` (11 tests), `skinCancerPhase5.test.ts` (13 tests).

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

### Current inpatients dashboard

Cases with `stayType === "inpatient"` and no `dischargeDate` shown in collapsible "Current Inpatients" section with day count and quick-discharge button.

### Dashboard redesign (v2)

The dashboard is being rebuilt as a **surgical triage surface** — density-first, optimised for 5–10 second scan sessions. Implementation follows 5 sequential phases, each documented in a standalone markdown file in the project knowledge base.

#### Phase documents (authoritative — implement exactly as specified)

| Phase | File | Scope |
|-------|------|-------|
| 1 | `dashboard-phase1-skeleton-filter-fab.md` | SpecialtyFilterBar, AddCaseFAB, header refactor, layout skeleton |
| 2 | `dashboard-phase2-case-cards.md` | CaseCard with photo thumbnails, RecentCasesList, DashboardEmptyState |
| 3 | `dashboard-phase3-practice-pulse.md` | PracticePulseRow, PulseMetricCard, usePracticePulse hook |
| 4 | `dashboard-phase4-needs-attention.md` | NeedsAttentionCarousel, AttentionCard, useAttentionItems hook |
| 5 | `dashboard-phase5-polish-audit.md` | Dark/light mode audit, animations, haptics, performance, cleanup |

**Read the relevant phase document before starting work.** Each contains exact component specs, TypeScript interfaces, pixel measurements, and testing checklists.

#### Locked architectural decisions

| Decision | Locked value |
|----------|-------------|
| Dashboard philosophy | Density-first. NOT clarity-first, NOT feed-first. |
| Zone order (top→bottom) | Filter Bar → Needs Attention → Practice Pulse → Recent Cases |
| Primary action | FAB (bottom-right, 56px, amber). NOT a header button. |
| Header | OpusMark left-aligned. NO text title. NO greeting. |
| Statistics | Numbers + deltas only on dashboard. NO charts. Charts behind tap on future Analytics screen. |
| Notifications | Zone 1 presence/absence IS the notification. NO red dots, NO badge counts. |
| Customisation | None. One excellent default. Specialty filter is the only personalisation. |
| Zone 1 empty behaviour | Returns `null`. NOT an empty View, NOT a placeholder. Zone does not exist when 0 items. |

#### Component registry

```
client/components/dashboard/
  SpecialtyFilterBar.tsx       # Zone 0 — sticky horizontal chip bar
  NeedsAttentionCarousel.tsx   # Zone 1 — horizontal FlatList of AttentionCards
  AttentionCard.tsx             # Zone 1 — inpatient or episode card
  PracticePulseRow.tsx          # Zone 2 — 3-metric row container
  PulseMetricCard.tsx           # Zone 2 — individual metric card
  RecentCasesList.tsx           # Zone 3 — mapped CaseCard list
  CaseCard.tsx                  # Zone 3 — individual case row with thumbnail
  AddCaseFAB.tsx                # Floating action button overlay
  DashboardEmptyState.tsx       # Zero-case state

client/hooks/
  usePracticePulse.ts           # Computes thisMonth/thisWeek/completion metrics
  useAttentionItems.ts          # Merges inpatients + episodes, sorted by urgency
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

- **All components use `theme.*` tokens.** The only raw hex values allowed are `#E5A00D` (canonical amber) and the delta colours `#059669` (success green) / `#9B2C2C` (muted destructive red).
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

- Never add a greeting header ("Good morning, ..."). The header is OpusMark only.
- Never show charts, graphs, or sparkline charts (other than the 7-dot sparkline) on the dashboard surface. The pulse metric sparkline is 7 circles, not a line chart.
- Never show a "Needs Attention" section header when there are 0 items. The entire zone must be `null`.
- Never use a vertical FlatList for the recent cases inside the ScrollView (VirtualizedList nesting warning).
- Never reorder filter chips on selection. Order is static: All, then specialties per `categories.ts`.
- Never put the FAB inside the ScrollView. It is absolutely positioned outside, overlaying scroll content.
- Never add tutorial cards, onboarding hints, or "tip of the day" to the dashboard.
- Never use `headerTransparent: true` on the dashboard screen. Solid `theme.backgroundRoot`, consistent with `useScreenOptions()`.
- Never add notification badges or red dot indicators anywhere on the dashboard.
- Never duplicate inpatient display — the old Current Inpatients section is REPLACED by Zone 1, not supplemented.

#### Specialty filter effects

When a specialty is selected (non-null), ALL zones filter simultaneously:
- Zone 1: only inpatients/episodes matching that specialty
- Zone 2: all three metrics recalculate for that specialty
- Zone 3: only cases matching that specialty; section header becomes "{Specialty} Cases"
- FAB: pre-selects that specialty in the new case form

When "All" is selected (null), all zones show unfiltered aggregate data.

#### Incremental implementation

Phases are designed so the dashboard improves incrementally. After each phase, the app must build, run, and be fully functional:
- After Phase 1: new layout skeleton with old content + filter + FAB
- After Phase 2: new case cards replace old ones
- After Phase 3: metrics row appears
- After Phase 4: attention carousel replaces old inpatient section
- After Phase 5: polish pass, old components removed

**Do not jump ahead.** Complete each phase, test against its checklist, then proceed. Each phase doc has a "Testing Checklist" section — use it.

### App lock

PIN and biometric unlock via `AppLockContext`. Setup in `SetupAppLockScreen`, unlock in `LockScreen`. PIN hashed in `appLockStorage.ts`, biometric detection in `biometrics.ts`. Auto-lock timeout management.

### Favourites & recents

`useFavouritesRecents` hook tracks recent/favourite diagnosis-procedure pairs in AsyncStorage. `FavouritesRecentsChips` component for quick access.

### Staging configurations

14 systems: Tubiana, Gustilo-Anderson, Breslow, CTS Severity, Quinnell, TNM, NPUAP, Burns Depth/TBSA, Baker Classification, Hurley Stage, ISL Stage, House-Brackmann Grade, Wagner Grade, Le Fort Classification.

### Data export

CSV (`exportCsv.ts`) and FHIR (`exportFhir.ts`) formats. Export orchestration in `export.ts`. Configurable via `PersonalisationScreen`.

### Procedure outcomes

Polymorphic outcome tracking via `procedure_outcomes` table (JSONB `details` field). Outcome types are flexible. Linked to `case_procedures`. Synced via `outcomeSync.ts`.

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

### Encrypted media
- Photos encrypted with XChaCha20-Poly1305, stored in AsyncStorage (`@surgical_logbook_media_[uuid]`)
- `encrypted-media:[uuid]` URI scheme; `EncryptedImage` component handles async decryption with in-memory cache
- Cleanup on case/photo delete
- Pending base64 pattern for navigation flow (`setPendingBase64`/`consumePendingBase64`)

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
- **Version:** 1.3.0, buildNumber 2
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
- **Encrypted URIs** — `encrypted-media:[uuid]` scheme for media references
- **Draft auto-save** — debounced + AppState background flush

## Testing

- **Framework:** Vitest 4.0.18, **160 tests** across 8 files
- **Client tests:** `client/lib/__tests__/` — handTraumaDiagnosis, handTraumaMapping, handTraumaUx, skinCancerConfig (80 tests), skinCancerPhase4 (11 tests), skinCancerPhase5 (13 tests)
- **Server tests:** `server/__tests__/` — auth, validation
- **Run:** `npm run test` (once) or `npm run test:watch` (watch mode)
