# CLAUDE.md — Opus (Surgical Case Logbook)

## What is this project?

A full-stack Expo/React Native surgical case logbook app (branded as **Opus**) for documenting surgical procedures, tracking post-operative outcomes, and generating analytics. Supports multiple surgical specialties with SNOMED CT coding, free flap tracking, anastomosis logging, wound assessments, and infection episode monitoring. Privacy-first design with on-device data storage and end-to-end encryption. Integrates RACS MALT fields for auditing and logging.

## v2.0 Overhaul Status

- **Phase 1 ✅ COMPLETE** — Form state refactor (useReducer, split context, 7 section components, clear/reset button)
- **Phase 2 ✅ COMPLETE** — Charcoal+Amber theme, card-based diagnosis-procedure groups, section nav bar, summary view with SNOMED codes and validation, move-up/down reordering, primary badge, specialty module consistency
- **Phase 3 → NEXT** — Favourites/recents, inline validation, keyboard optimisation, haptic audit, duplicate case
- **Phase 4** — Data migration, export formatting, analytics dashboard
- **Phase 5** — TestFlight release

## Tech stack

- **Frontend:** Expo 54, React Native 0.81, React 19, TypeScript, React Navigation 7, TanStack React Query 5, React Native Reanimated
- **Backend:** Express 4, TypeScript, Drizzle ORM, PostgreSQL (pg driver)
- **Auth:** JWT with token versioning, bcryptjs, rate-limited auth endpoints
- **Encryption:** @noble/* (hashes, curves, ciphers) — E2EE device key scaffolding in place
- **Email:** Resend (password reset flows)
- **Build:** tsx for dev server, esbuild for server prod build, Expo for client builds

## Commands

```bash
npm run server:dev     # Start Express API server (port from .env, default 5001 locally)
npm run expo:dev       # Start Expo dev client
npm run db:push        # Push Drizzle schema to PostgreSQL (loads .env)
npm run server:build   # Production server build → server_dist/
npm run server:prod    # Run production server
npm run lint           # ESLint via Expo
npm run check:types    # TypeScript type-check (tsc --noEmit)
npm run format         # Prettier format
```

## Local development setup

1. PostgreSQL must be running locally (Homebrew postgresql@16)
2. `.env` file in project root with: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`
3. `npm install` then `npm run db:push` to create tables
4. `npm run server:dev` starts the API server
5. Port 5000 conflicts with macOS AirPlay — use port 5001

## Project structure

```
client/
  App.tsx                    # Root with ThemeProvider, AuthContext, ThemedNavigationContainer
  screens/
    AuthScreen.tsx           # Login/signup/password reset
    OnboardingScreen.tsx     # First-time setup (profile, facilities)
    DashboardScreen.tsx      # Case list, filtering, statistics
    CaseDetailScreen.tsx     # Full case record view
    CaseFormScreen.tsx       # Case entry (~240 lines, delegates to section components)
    AddCaseScreen.tsx        # Case entry initiation workflow
    AddTimelineEventScreen.tsx  # Post-op complications/follow-ups
    AddOperativeMediaScreen.tsx # Intraoperative image capture
    MediaManagementScreen.tsx   # Batch media upload
    SettingsScreen.tsx       # Profile, data export, legal
  navigation/
    RootStackNavigator.tsx   # Auth → Onboarding → Main flow
    MainTabNavigator.tsx     # Bottom tabs: Dashboard + Settings
    DashboardStackNavigator.tsx
    SettingsStackNavigator.tsx
  components/               # ~60 components (forms, editors, display, layout)
    case-form/               # 9 section components extracted from CaseFormScreen
      PatientInfoSection.tsx
      AdmissionSection.tsx
      DiagnosisProcedureSection.tsx
      PatientFactorsSection.tsx
      OperativeFactorsSection.tsx
      OutcomesSection.tsx
      CollapsibleFormSection.tsx  # Shared collapsible card wrapper
      SectionNavBar.tsx          # Sticky horizontal pill navigation
      CaseSummaryView.tsx        # Read-only review before save
    hand-trauma/             # 10 files — zone-and-digit-driven UI for hand trauma cases
  contexts/
    AuthContext.tsx           # Auth state, profile, facilities, device keys
    MediaCallbackContext.tsx  # Cross-screen media selection callbacks
    CaseFormContext.tsx       # Split context: CaseFormStateContext + CaseFormDispatchContext
  hooks/
    useTheme.ts              # ThemeProvider, persists to AsyncStorage, system/light/dark
    useCaseForm.ts           # useReducer-based form state (SET_FIELD, LOAD_CASE, RESET_FORM)
    useCaseDraft.ts          # Auto-save drafts (debounced + AppState background flush)
    useColorScheme.ts        # System colour scheme detection
    useScreenOptions.ts      # Shared navigation header options
  lib/
    auth.ts                  # JWT token management, device key registration
    storage.ts               # Local AsyncStorage for offline-first cases
    query-client.ts          # TanStack React Query + API base URL
    encryption.ts / e2ee.ts  # E2EE utilities and device key management
    snomedCt.ts              # SNOMED CT code mapping
    procedureConfig.ts       # Specialty-specific form field config
    statistics.ts            # Case analytics calculations
    mediaStorage.ts          # Image encryption + storage
    melanomaStaging.ts       # Melanoma staging rules
    migration.ts             # Auto-migrates old case formats on load
    snomedCodeMigration.ts   # Old→new SNOMED code mapping
    diagnosisPicklists/      # Pre-built diagnosis suggestions by specialty
  types/
    case.ts                  # Case, Procedure, TimelineEvent, MediaAttachment
    diagnosis.ts             # Diagnosis with TNM/Breslow/Clark staging
    infection.ts             # Post-op infection tracking
    wound.ts                 # Wound assessment dimensions
  data/
    aoHandClassification.ts  # AO hand trauma codes
    facilities.ts            # Master facility database
    flapFieldConfig.ts       # Flap-specific form configs
server/
  index.ts                   # Express server entry (CORS, body parsing, routing)
  routes.ts                  # 40+ API endpoints (auth, profile, procedures, flaps, SNOMED)
  storage.ts                 # DatabaseStorage class (Drizzle queries, ownership checks)
  db.ts                      # Drizzle + pg Pool connection
  snomedApi.ts               # Ontoserver FHIR integration for live SNOMED search
  email.ts                   # Resend email (password reset)
  diagnosisStagingConfig.ts  # Dynamic staging form definitions
  seedData.ts                # SNOMED reference data seed (~33KB)
  templates/                 # HTML: landing page, privacy, terms, reset-password, licenses
shared/
  schema.ts                  # Drizzle ORM table definitions (12 tables)
migrations/                  # SQL migration files
```

## Key architecture

- **Navigation:** Auth → Onboarding → Main (bottom tabs: Dashboard, Settings) with modal stack for case entry/detail
- **Data ownership:** Hierarchical: User → Procedure → Flap → Anastomosis. Ownership verified at each API level.
- **SNOMED CT:** Curated picklists in `snomed_ref` table + live search via Ontoserver FHIR API
- **Offline-first:** Local AsyncStorage for cases; server sync via API
- **E2EE scaffolding:** Device key registration in place; media encryption implemented
- **Multi-specialty:** Hand surgery, orthoplastic, breast, burns, head/neck, aesthetics, general, body contouring
- **Theme:** ThemeProvider in `client/hooks/useTheme.ts` wraps the app. `useTheme()` returns `{ theme, isDark, colorScheme, preference, toggleColorScheme, setColorScheme }`. Default is dark mode; respects system preference; user override persists to AsyncStorage. `ThemedNavigationContainer` in `App.tsx` maps theme to React Navigation's Theme prop.
- **Case form:** `CaseFormScreen.tsx` (~240 lines) delegates to 7 section components via `CaseFormContext`. Form state is a `useReducer` in `useCaseForm.ts` with actions: `SET_FIELD`, `SET_FIELDS`, `RESET_FORM`, `LOAD_DRAFT`, `LOAD_CASE`. Draft auto-save via `useCaseDraft.ts` (debounced writes + AppState background flush). Summary view (`CaseSummaryView.tsx`) gates save with validation.
- **Multi-Diagnosis Group Architecture:** Each Case has `diagnosisGroups: DiagnosisGroup[]` instead of flat diagnosis/procedures fields. Each DiagnosisGroup bundles a specialty, diagnosis, staging, fractures, and procedures. Enables multi-specialty cases (e.g., hand surgery + orthoplastic). Old cases auto-migrated on load via `client/lib/migration.ts`. Helpers: `getAllProcedures(c)`, `getCaseSpecialties(c)`, `getPrimaryDiagnosisName(c)` in `client/types/case.ts`.
- **RACS MALT Data Model:** Comprehensive implementation of RACS MALT requirements including supervision levels.

## Database tables (PostgreSQL)

`users`, `profiles`, `user_facilities`, `user_device_keys`, `password_reset_tokens`, `procedures`, `flaps`, `anastomoses`, `case_procedures`, `snomed_ref`, `teams`, `team_members`

**Performance indexes** (`migrations/add_performance_indexes.sql`): 8 indexes on high-frequency query paths — procedures (user_id, user_id+date), flaps (procedure_id), anastomoses (flap_id), case_procedures (case_id), password_reset_tokens (expires_at), snomed_ref (category+is_active), user_facilities (user_id). All use `IF NOT EXISTS` for idempotent execution.

## Path aliases (tsconfig + babel)

- `@/*` → `client/*`
- `@shared/*` → `shared/*`

## Environment variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `JWT_SECRET` — Secret for JWT signing (required)
- `PORT` — Server port (default 5000, use 5001 locally on macOS)
- `NODE_ENV` — `development` or `production`
- `ENABLE_SEED` / `SEED_TOKEN` — Gate SNOMED seed endpoint (dev only)

## Supported specialties

Hand surgery, Orthoplastic, Breast, Body contouring, Burns, Head & neck, Aesthetics, General

## Feature modules

### Procedure Picklists & SNOMED CT

- **Complete 8-Specialty Procedure Picklist:** 412 unique procedures across all 8 specialties (Orthoplastic 43, Hand Surgery 94, Head & Neck 93, General 80, Breast 47, Burns 34, Aesthetics 53, Body Contouring 31). Includes Facial Soft Tissue Trauma (8 procedures) and Soft Tissue Trauma (6 procedures) subcategories. Skin cancer/melanoma procedures and diagnoses cross-tagged between General and Head & Neck. All specialties use the subcategory picker UI.
- **SNOMED CT Audit:** ~70 entries fixed across CRITICAL/HIGH/MEDIUM priorities — botulinum toxin US→INT edition, dermal filler hierarchy, burns codes, LD flap, cleft palate, body contouring, breast procedures, cross-map alignment.
- **SNOMED Code Migration:** `client/lib/snomedCodeMigration.ts` maintains old→new code mapping. `migrateCase()` in `client/lib/migration.ts` transparently updates old codes on load (historical data preserved).

### Diagnosis-to-Procedure Suggestions

- 161 structured diagnoses across all 8 specialties with procedure suggestions (staging-conditional).
- Selecting a diagnosis auto-populates default procedures; staging changes activate/deactivate conditional procedures.
- Components: `DiagnosisPicker`, `ProcedureSuggestions`.

### Procedure-First (Reverse) Entry

Dual-entry flow — when a surgeon picks procedures without a diagnosis first, a "What's the diagnosis?" card appears with smart suggestions derived from reverse-mapping procedures to likely diagnoses. Same-specialty suggestions shown first, cross-specialty grouped separately. Reverse index built lazily in `client/lib/diagnosisPicklists/index.ts` (`getDiagnosesForProcedure`, `getDiagnosesForProcedures`). UI component: `client/components/DiagnosisSuggestions.tsx`, wired into `DiagnosisGroupEditor.tsx`.

### Hand Trauma Structure Picker

Zone-and-digit-driven UI accelerator for hand surgery trauma cases (`client/components/hand-trauma/`). Activates when `groupSpecialty === "hand_surgery" && clinicalGroup === "trauma"`. Surgeon selects affected digits (I–V), then checks injured structures across 6 accordion categories: flexor tendons (zone I–V/T1–T3), extensor tendons (zone I–VIII/TI–TV), nerves (digital N1–N10 + proximal median/ulnar/radial/DBUN), arteries (digital A1–A10 + proximal radial/ulnar/palmar arches), ligaments (PIP collateral, MCP I UCL/RCL), and other (bone, nail bed, skin loss, volar plate). Each checked structure auto-generates a `CaseProcedure` via `STRUCTURE_PROCEDURE_MAP` lookup with SNOMED codes and descriptive notes. Smart defaults auto-expand relevant sections based on diagnosis. Data stored in `DiagnosisClinicalDetails.handTrauma: HandTraumaDetails`.

### Hand Surgery Form Restructure

Fracture checkbox removed (was UI-only state, not in DB). AO/OTA classification auto-shows when `hasFractureSubcategory` is true. Field order for fracture cases: Laterality → Affected Structures → AO/OTA Classification → Injury Mechanism. AO/OTA entry upgraded to smart inline `AOTAClassificationCard` with classified/unclassified states.

### Multi-Lesion Session

Supports logging 3–6 skin lesion excisions from one operative session as discrete, auditable entries within a single diagnosis group.
- **Types** (`client/types/case.ts`): `LesionInstance`, `LesionPathologyType`, `LesionReconstruction` — each instance captures site, pathology type, reconstruction method, dimensions, margins, margin status, and optional SNOMED CT site modifier.
- **DiagnosisGroup extension:** `isMultiLesion?: boolean` and `lesionInstances?: LesionInstance[]` fields. Old cases without these fields load without errors (backward compatible).
- **MultiLesionEditor** (`client/components/MultiLesionEditor.tsx`): Collapsible row-per-lesion UI with quick-pick anatomical sites, pathology type selector, reconstruction picker, dimension/margin inputs, margin status, and swipe-to-delete. "Add" appends blank row; "Duplicate last" copies prior row.
- **Toggle:** Appears in `DiagnosisGroupEditor` when `hasEnhancedHistology` or specialty is `general`/`head_neck`. Replaces standard procedure list when on.
- **Helpers:** `getAllLesionInstances(case)` returns all lesion instances across groups; `getExcisionCount(case)` counts discrete excisions.

### Staging Configurations

14 staging systems: Tubiana, Gustilo-Anderson, Breslow, CTS Severity, Quinnell, TNM, NPUAP, Burns Depth/TBSA, Baker Classification, Hurley Stage, ISL Stage, House-Brackmann Grade, Wagner Grade, Le Fort Classification.

### Wound Episode Tracker

Serial wound assessment documentation as a timeline event type (`wound_assessment`).
- **WoundAssessmentForm** (`client/components/WoundAssessmentForm.tsx`): Progressive-disclosure form with 11 sections — dimensions (auto-area), TIME classification (Tissue/Infection/Moisture/Edge), surrounding skin, dressing catalogue (40+ products grouped by category), healing trend, intervention notes, clinician note, next review date.
- **WoundAssessmentCard** (`client/components/WoundAssessmentCard.tsx`): Compact timeline card with header badge, dimensions, tissue/exudate/edge details, infection signs (red highlight), dressings list, healing trend (colour-coded), and clinician note.
- **WoundDimensionChart** (`client/components/WoundDimensionChart.tsx`): SVG line chart (react-native-svg) showing wound area (cm²) over time; renders when >= 2 wound assessments with area data exist.
- **Types** (`client/types/wound.ts`): WoundAssessment, WoundDressingEntry, DressingProduct, TIME classification types, DRESSING_CATALOGUE (40+ products with SNOMED CT codes where applicable).
- **Integration:** Extends `TimelineEvent` with `woundAssessmentData?: WoundAssessment`; patched into AddTimelineEventScreen and CaseDetailScreen.

### Infection Documentation Module

Comprehensive infection case documentation with serial episode tracking.
- **InfectionOverlay:** Attachable overlay for any case specialty.
- **Quick Templates:** Pre-configured templates for common infection patterns (Abscess, Necrotising Fasciitis, Implant Infection, etc.).
- **Infection Syndromes:** Categories: Skin/Soft Tissue, Deep Infection, Bone/Joint.
- **Serial Episode Tracking:** Auto-incrementing episode numbers for multiple operative interventions.
- **Microbiology Data:** Culture status, organism entries with resistance flags.
- **Active Cases Dashboard:** Prominent display of active infection cases.
- **Infection Statistics:** Dashboard card showing counts, averages, and breakdowns.

### Current Inpatients Dashboard

Cases with `stayType === "inpatient"` and no `dischargeDate` shown in a collapsible "Current Inpatients" section on the Dashboard with day count since admission and quick-discharge button. Discharge date field is clearable.

### Free Flap / Orthoplastic Documentation

- **Picklist-to-Flap Mapping** (`client/lib/procedurePicklist.ts`): `PICKLIST_TO_FLAP_TYPE` maps picklist entry IDs to `FreeFlap` enum values. Auto-populates `flapType` and shows locked confirmation badge instead of full 18-flap picker. Generic/unmapped entries show full picker.
- **FreeFlapPicker Component:** Selectable list of 18 free flaps.
- **Config-Driven Elevation Planes:** Per-flap configurable elevation planes.
- **Flap-Specific Conditional Fields:** Config-driven field rendering via `flapFieldConfig.ts` (~100 typed fields).
- **Donor Vessel Auto-Population:** Automatic suggestion based on flap type.
- **Recipient Site Regions:** Includes Knee.
- **Recipient Vessel Presets:** Local presets for common recipient vessels by body region.
- **Recipient Site Laterality:** `recipientSiteLaterality` field in `FreeFlapDetails`. Both Harvest Side and Recipient Side use filled segmented buttons displayed side-by-side.
- **Simplified Anastomosis Documentation:** Streamlined arterial and venous documentation.

### Anastomosis UI (AnastomosisEntryCard)

- **Segmented buttons:** Technique (vein) and Configuration fields use segmented button groups instead of PickerField dropdowns.
- **Coupler constraint:** Selecting "Coupler" auto-sets configuration to "End-to-End" and locks other options (dimmed at 35% opacity). Enforced on initial load via useEffect.

### Diagnosis Group Editor

- **Collapsible groups:** Multi-diagnosis groups collapse to a compact summary card (specialty + diagnosis + procedure count). Auto-expanded when no diagnosis selected.
- **Free flap initialization:** Auto-created free flap procedures from diagnosis suggestions include initialized `clinicalDetails` (flapType, SNOMED codes, harvest side, indication, empty anastomoses).

### Extended Details Collapsible

`ExtendedDetailsSection` in `CaseFormScreen.tsx` wraps Surgery Timing, Operating Team, Risk Factors, Infection Documentation, and Outcomes behind a collapsible section (collapsed by default). Uses `Animated.spring` for height animation with dynamic content height re-measurement. Save button always visible below.

## Authentication & Security

- **Password Security:** bcrypt hashing (10 rounds), minimum 8-character passwords.
- **Password Reset Flow:** Token-based reset via web page, tokens expire after 1 hour and are single-use.
- **JWT Token Revocation:** `tokenVersion` mechanism revokes all existing tokens on password change.
- **Profile Update Protection:** Restricted fields to prevent mass assignment vulnerabilities.
- **Rate Limiting:** Auth endpoints protected against brute force attacks.
- **Patient Identifier Privacy:** Patient identifiers in local case index are SHA-256 hashed.
- **Endpoint Protection:** All SNOMED and staging endpoints require authentication.

## Encryption Architecture

- **XChaCha20-Poly1305 AEAD:** All local case data encrypted.
- **Envelope Format:** `enc:v1:nonce:ciphertext` for version identification.
- **Backward Compatibility:** Legacy XOR-encrypted data automatically re-encrypted.
- **Key Derivation:** Device encryption key derived from user passphrase using scrypt.

### End-to-End Encryption Scaffolding

- **Per-Device Key Pairs:** Each device generates X25519 key pair stored securely.
- **Device Key Registration:** Public keys registered with server.
- **Key Registry API:** Server stores device public keys and metadata.
- **Key Revocation:** Devices can be remotely revoked.
- **Case Key Wrapping:** Infrastructure for wrapping symmetric case keys with recipient public keys.

### Encrypted Media Storage

- Photos encrypted with XChaCha20-Poly1305 and stored in AsyncStorage as individual entries (`@surgical_logbook_media_[uuid]`). No filesystem dependency.
- Image picker calls use `base64: true` for direct data without filesystem operations.
- `encrypted-media:[uuid]` URI scheme in case data. `EncryptedImage` component handles async decryption with in-memory caching. Passes through non-encrypted URIs (legacy `file://` paths).
- All intake paths covered: `OperativeMediaSection`, `MediaCapture`, `AddOperativeMediaScreen`, `MediaManagementScreen` via `client/lib/mediaStorage.ts`.
- Cleanup on delete: `deleteCase()` in storage.ts removes associated media. Individual photo removal also cleans up.
- **Pending base64 pattern:** For the AddOperativeMedia navigation flow, base64 data held in a module-level store (`setPendingBase64`/`consumePendingBase64`) to avoid large strings through navigation params.

## Edit Mode (CaseFormScreen)

- **Clinical details round-trip:** Restores `clinicalDetails`, `recipientSiteRegion`, and `anastomoses` from existing case data.
- **Save payload:** Uses actual `clinicalDetails` state (not placeholder), preserving all clinical data through edits.
- **Draft isolation:** Draft loading skipped in edit mode (`isEditMode` guard) to prevent race conditions.
- **Unconditional setters:** All field setters use `?? ""` / `?? defaultValue` instead of conditional `if`, ensuring cleared fields persist correctly.
- **Header save ref pattern:** `handleSaveRef.current` always points to the latest `handleSave` closure, so the header button never captures stale state.

## Email Configuration

- **Provider:** Resend integration for transactional emails.
- **From Address:** noreply@drgladysz.com
- **Email Types:** Password reset and welcome emails with branded HTML templates.

## iOS / App Store distribution

- **Bundle ID:** `com.drgladysz.opus`
- **App Store listing name:** Opus Logbook
- **Home screen name:** Opus
- **App Store Connect App ID:** 6759992788
- **SKU:** opus-surgical-logbook
- **Apple Developer Team ID:** 8CQ38RR2W4
- **Expo slug:** opus
- **EAS Project ID:** 0bc1b91c-c240-4f4e-b030-31d16389cd1e
- **Expo account:** @gladmat
- **iOS Permissions:** expo-image-picker plugin configured in `app.json` with custom `photosPermission` and `cameraPermission` strings.

## Railway deployment (production API)

- **Project:** surgical-logbook-api
- **URL:** https://api-server-production-4dd7.up.railway.app
- **Services:** `api-server` (Express backend) + `Postgres` (PostgreSQL database)
- **Deploy method:** `railway up` from project root (CLI push)
- **Build:** Nixpacks, Node 20, `npm run server:build` → CJS bundle → `node server_dist/index.js`
- **Config:** `railway.toml` in project root
- **Env vars on Railway:** `DATABASE_URL` (references Postgres service), `JWT_SECRET`, `PORT=5000`, `NODE_ENV=production`
- **Healthcheck:** `GET /api/health`
- **Schema push:** Use public DATABASE_URL from Postgres service with `npx drizzle-kit push`

## Brand & Design System: Charcoal + Amber

Dark-mode-first design with warm charcoal palette and amber as the singular accent colour. Defined in `client/constants/theme.ts`.

### Colour Palette
- **Backgrounds**: Charcoal scale — #0F1419 (root), #1A1F26 (surface), #242B33 (raised), #2E3740 (border)
- **Text**: #F0F2F4 (primary dark), #94A3B8 (secondary dark), #64748B (tertiary dark)
- **Accent (Amber)**: #D97706 (dark mode), #B45309 (light mode) — interactive elements ONLY
- **Warning**: #FB923C (dark), #EA580C (light) — deliberately distinct from amber accent
- **Error**: #DC2626 both modes
- **Success**: #15803D (dark), #16A34A (light)
- **buttonText**: #0F1419 — dark text on amber backgrounds for legibility

### Specialty Colors
Per-specialty colors in `theme.specialty[specialty]` — pastel on dark, deeper on light:
- Dark: breast=#D8B4FE, hand_surgery=#7DD3FC, orthoplastic=#86EFAC, head_neck=#FDBA74, body_contouring=#FDA4AF, burns=#FB923C, aesthetics=#F9A8D4, general=#94A3B8
- Light: breast=#7C3AED, hand_surgery=#0369A1, orthoplastic=#15803D, head_neck=#C2410C, body_contouring=#BE123C, burns=#9A3412, aesthetics=#BE185D, general=#475569
- Used for badges (`SpecialtyBadge`), icons (`SpecialtyIcon` with custom SVGs), and chart segments
- Amber accent remains for interactive elements; specialty colors for specialty identification only

### Design Rules
- Amber accent on interactive elements only (buttons, links, selected states). Never on static text.
- Never #000000 as background — use charcoal.950 (#0F1419)
- Never #FFFFFF as text in dark mode — use #F0F2F4
- Font weight for emphasis, NOT colour variation
- Numbers in SF Pro Mono in data-dense views (summary, dashboard)
- Card accent borders: primary group = theme.link full opacity; groups 2+ = theme.link at 60%/35% opacity
- All cards: Shadows.card + BorderRadius.md (14px) + theme.backgroundElevated

### Typography
- display: 28/36/700, h1: 22/30/700, h2: 18/26/600, h3: 16/24/600, h4: 15/22/600
- body: 16/24/400, small: 14/20/400, footnote: 13/18/400, caption: 12/16/400
- mono: 14/20/500 with SF Mono (iOS) / monospace (Android) — for numerical data
- label: 12/16/500 uppercase with 0.5 letter-spacing

### Border Radius
- xs: 6, sm: 10 (inputs/buttons), md: 14 (cards), lg: 20, xl: 28, full: 9999

### Touch Targets
- Minimum 48px (enforced via Spacing.touchTarget)

## Style conventions

- Strict TypeScript throughout
- React Navigation for all routing (not Expo Router)
- TanStack React Query for server state
- Zod + drizzle-zod for validation at API boundaries
- Components use React Native primitives (View, Text, ScrollView)
- @noble/* for cryptographic operations (not Web Crypto)
- No test suite yet
