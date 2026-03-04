# CLAUDE.md — Opus (Surgical Case Logbook)

## What is this project?

A full-stack Expo/React Native surgical case logbook app (branded as **Opus**) for documenting surgical procedures, tracking post-operative outcomes, and generating analytics. Supports multiple surgical specialties with SNOMED CT coding, free flap tracking, anastomosis logging, wound assessments, and infection episode monitoring. Originally built on Replit.

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
npm run expo:dev       # Start Expo dev client (designed for Replit — needs env adjustment locally)
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

## Database tables (PostgreSQL)

`users`, `profiles`, `user_facilities`, `user_device_keys`, `password_reset_tokens`, `procedures`, `flaps`, `anastomoses`, `case_procedures`, `snomed_ref`, `teams`, `team_members`

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
