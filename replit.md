# Opus

## Overview

Surgical Logbook is a privacy-first mobile application for surgeons to document surgical procedures, particularly microsurgery and free flap reconstruction. Its main purpose is to streamline case logging while ensuring complete patient confidentiality. It integrates RACS MALT fields for auditing and logging. The application emphasizes on-device data storage and end-to-end encryption.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application is built with a strong emphasis on privacy, local processing, and a flexible data model.

### Frontend Architecture
- **Framework**: React Native with Expo SDK.
- **Navigation**: React Navigation.
- **State Management**: TanStack React Query for server state.
- **Styling**: React Native StyleSheet with custom theme (light/dark mode).

### Backend Architecture
- **Runtime**: Express.js server with TypeScript.
- **API Design**: RESTful endpoints for SNOMED CT lookups and reference data.
- **Security**: All API endpoints are auth-gated except health check and auth routes.

### Data Model
- **Local-first Architecture**: Patient data stored locally with encryption.
- **Flexible JSON Payload**: `clinical_details` uses a flexible JSON structure for diverse surgical specialties.
- **Core Case Fields**: Includes patient demographics, diagnoses, operative factors, SNOMED CT codes, and outcomes.
- **RACS MALT Data Model**: Comprehensive implementation of RACS MALT requirements.
- **Multi-Diagnosis Group Architecture**: Each Case has `diagnosisGroups: DiagnosisGroup[]` instead of flat diagnosis/procedures fields. Each DiagnosisGroup bundles a specialty, diagnosis, staging, fractures, and procedures. Enables multi-specialty cases (e.g., hand surgery + orthoplastic). Old cases are auto-migrated on load via `client/lib/migration.ts`. Helper functions: `getAllProcedures(c)`, `getCaseSpecialties(c)`, `getPrimaryDiagnosisName(c)` in `client/types/case.ts`.

### Key Features
- **Standardized Facility Selection**: Curated hospital list with user-managed "My Hospitals".
- **AO/OTA Fracture Classification**: Dynamic, cascading form for detailed fracture classification.
- **Dynamic Statistics Dashboard**: Specialty-aware analytics with multi-filtering.
- **Enhanced Follow-up Timeline**: Supports flexible follow-up intervals and various event types with media capture.
- **RACS MALT Supervision Levels**: Implementation of official RACS MALT supervision level codes.
- **Anatomical/Clinical Specialty Categories**: Restructured categories and procedure tagging system.
- **Modular Procedure Configuration**: Configuration files define specialty-specific fields.
- **Complete 8-Specialty Procedure Picklist**: 412 unique procedures across all 8 specialties (Orthoplastic 43, Hand Surgery 94, Head & Neck 93, General 80, Breast 47, Burns 34, Aesthetics 53, Body Contouring 31) including Facial Soft Tissue Trauma (8 procedures) and Soft Tissue Trauma (6 procedures) subcategories. Skin cancer/melanoma procedures and diagnoses cross-tagged between General and Head & Neck for multi-lesion cases with cross-specialty tagging and SNOMED CT codes. All specialties now use the subcategory picker UI. SNOMED CT codes audited and corrected (v1.0 audit: ~70 entries fixed across CRITICAL/HIGH/MEDIUM priorities — botulinum toxin US→INT edition, dermal filler hierarchy, burns codes, LD flap, cleft palate, body contouring, breast procedures, cross-map alignment).
- **SNOMED Code Migration**: `client/lib/snomedCodeMigration.ts` maintains old→new SNOMED code mapping. `migrateCase()` in `client/lib/migration.ts` transparently updates old codes on case load (Option B mapping layer — historical data preserved).
- **Diagnosis-to-Procedure Suggestion System**: 161 structured diagnoses across all 8 specialties with procedure suggestions (staging-conditional). Selecting a diagnosis auto-populates default procedures; staging changes activate/deactivate conditional procedures. Components: DiagnosisPicker, ProcedureSuggestions.
- **Procedure-First (Reverse) Entry**: Dual-entry flow — when a surgeon picks procedures without a diagnosis first, a "What's the diagnosis?" card appears with smart suggestions derived from reverse-mapping procedures to likely diagnoses. Same-specialty suggestions shown first, cross-specialty grouped separately. Selecting a reverse suggestion sets the diagnosis and merges any additional default procedures. Reverse index built lazily in `client/lib/diagnosisPicklists/index.ts` (`getDiagnosesForProcedure`, `getDiagnosesForProcedures`). UI component: `client/components/DiagnosisSuggestions.tsx`, wired into `DiagnosisGroupEditor.tsx`.
- **Hand Trauma Structure Picker**: Zone-and-digit-driven UI accelerator for hand surgery trauma cases (`client/components/hand-trauma/`). Activates when `groupSpecialty === "hand_surgery" && clinicalGroup === "trauma"`. Surgeon selects affected digits (I–V), then checks injured structures across 6 accordion categories: flexor tendons (zone I–V/T1–T3), extensor tendons (zone I–VIII/TI–TV), nerves (digital N1–N10 + proximal median/ulnar/radial/DBUN), arteries (digital A1–A10 + proximal radial/ulnar/palmar arches), ligaments (PIP collateral, MCP I UCL/RCL), and other (bone, nail bed, skin loss, volar plate). Each checked structure auto-generates a `CaseProcedure` via `STRUCTURE_PROCEDURE_MAP` lookup with SNOMED codes and descriptive notes. Smart defaults auto-expand relevant sections based on diagnosis. Data stored in `DiagnosisClinicalDetails.handTrauma: HandTraumaDetails`. New procedure entries: 4 vascular repairs + 2 ligament repairs. New diagnoses: complex laceration, DBUN injury. 10 files in `client/components/hand-trauma/`.
- **Hand Surgery Form Restructure**: Fracture checkbox removed (was UI-only state, not in DB). AO/OTA classification auto-shows when `hasFractureSubcategory` is true. Field order for fracture cases: Laterality → Affected Structures (digits/nerves) → AO/OTA Classification → Injury Mechanism. AO/OTA entry upgraded from dashed placeholder to smart inline `AOTAClassificationCard` with classified/unclassified states.
- **Extended Details Collapsible**: `ExtendedDetailsSection` in `CaseFormScreen.tsx` wraps Surgery Timing, Operating Team, Risk Factors, Infection Documentation, and Outcomes behind a collapsible section (collapsed by default). Uses `Animated.spring` for height animation with dynamic content height re-measurement. Save button remains always visible below.
- **Staging Configurations**: 14 staging systems including Tubiana, Gustilo-Anderson, Breslow, CTS Severity, Quinnell, TNM, NPUAP, Burns Depth/TBSA, Baker Classification, Hurley Stage, ISL Stage, House-Brackmann Grade, Wagner Grade, Le Fort Classification.
- **Multi-Procedure Support**: Allows logging multiple distinct procedures per case.
- **Current Inpatients Dashboard**: Cases with `stayType === "inpatient"` and no `dischargeDate` shown in a collapsible "Current Inpatients" section on the Dashboard with day count since admission and quick-discharge button. Discharge date field is clearable to allow reverting accidental entries.
- **Complete Password Management**: Change password and Forgot Password flow with email-based reset tokens.
- **App Store Legal Compliance**: Accessible Privacy Policy, Terms of Service, and Open Source Licenses.

### Wound Episode Tracker
Serial wound assessment documentation as a timeline event type (`wound_assessment`).
- **WoundAssessmentForm** (`client/components/WoundAssessmentForm.tsx`): Progressive-disclosure form with 11 sections — dimensions (auto-area), TIME classification (Tissue/Infection/Moisture/Edge), surrounding skin, dressing catalogue (40+ products grouped by category), healing trend, intervention notes, clinician note, next review date.
- **WoundAssessmentCard** (`client/components/WoundAssessmentCard.tsx`): Compact timeline card with header badge, dimensions, tissue/exudate/edge details, infection signs (red highlight), dressings list, healing trend (colour-coded), and clinician note.
- **WoundDimensionChart** (`client/components/WoundDimensionChart.tsx`): SVG line chart (react-native-svg) showing wound area (cm²) over time; renders only when >= 2 wound assessments with area data exist.
- **Types** (`client/types/wound.ts`): WoundAssessment, WoundDressingEntry, DressingProduct, TIME classification types, label records, DRESSING_CATALOGUE (40+ products with SNOMED CT codes where applicable — Kerecis Omega3 Wound/Burn/Marigen Scaffold, Integra DRT, BTM PolyNovo, etc.).
- **Integration**: Extends `TimelineEvent` with `woundAssessmentData?: WoundAssessment`; patched into AddTimelineEventScreen (event type grid + form) and CaseDetailScreen (card rendering + chart above timeline).

### Multi-Lesion Session
Supports logging 3–6 skin lesion excisions from one operative session as discrete, auditable entries within a single diagnosis group.
- **Types** (`client/types/case.ts`): `LesionInstance`, `LesionPathologyType`, `LesionReconstruction` — each instance captures site, pathology type, reconstruction method, dimensions, margins, margin status, and optional SNOMED CT site modifier.
- **DiagnosisGroup extension**: `isMultiLesion?: boolean` and `lesionInstances?: LesionInstance[]` fields. Old cases without these fields load without errors (backward compatible).
- **MultiLesionEditor** (`client/components/MultiLesionEditor.tsx`): Collapsible row-per-lesion UI with quick-pick anatomical sites, pathology type selector, reconstruction picker, dimension/margin inputs, margin status, and swipe-to-delete. "Add" appends blank row; "Duplicate last" copies prior row.
- **Toggle**: Appears in `DiagnosisGroupEditor` when `hasEnhancedHistology` or specialty is `general`/`head_neck`. When on, replaces standard procedure list with MultiLesionEditor; when off, standard procedure entry is restored.
- **Helpers**: `getAllLesionInstances(case)` returns all lesion instances across groups; `getExcisionCount(case)` counts discrete excisions (lesion instances + procedures from non-multi-lesion groups).

### Infection Documentation Module
Comprehensive infection case documentation with serial episode tracking.
- **InfectionOverlay**: Attachable overlay for any case specialty.
- **Quick Templates**: Pre-configured templates for common infection patterns (Abscess, Necrotising Fasciitis, Implant Infection, etc.).
- **Infection Syndromes**: Various categories like Skin/Soft Tissue, Deep Infection, Bone/Joint.
- **Progressive Disclosure UI**: Collapsible sections for microbiology, clinical scores, and episode details.
- **Serial Episode Tracking**: Auto-incrementing episode numbers for multiple operative interventions.
- **Microbiology Data**: Culture status, organism entries with resistance flags.
- **Active Cases Dashboard**: Prominent display of active infection cases.
- **Infection Statistics**: Dashboard card showing counts, averages, and breakdowns.

### Free Flap / Orthoplastic Documentation
- **Picklist-to-Flap Mapping** (`client/lib/procedurePicklist.ts`): `PICKLIST_TO_FLAP_TYPE` maps picklist entry IDs to `FreeFlap` enum values. When a surgeon selects a specific flap from the picklist (e.g., "Free ALT flap"), `flapType` is auto-populated and the clinical details form shows a locked confirmation badge instead of the full 18-flap picker. Generic/unmapped entries still show the full picker.
- **FreeFlapPicker Component**: Selectable list of 18 free flaps.
- **Config-Driven Elevation Planes**: Per-flap configurable elevation planes.
- **Flap-Specific Conditional Fields**: Config-driven field rendering via `flapFieldConfig.ts` for detailed clinical parameters (~100 typed fields).
- **Donor Vessel Auto-Population**: Automatic suggestion of donor vessels based on flap type.
- **Recipient Site Regions**: Expanded to include Knee.
- **Recipient Vessel Presets**: Local presets for common recipient vessels by body region.
- **Simplified Anastomosis Documentation**: Streamlined arterial and venous documentation.

### Authentication & Security
- **Password Security**: bcrypt hashing (10 rounds), minimum 8-character passwords.
- **Password Reset Flow**: Token-based reset via web page, tokens expire after 1 hour and are single-use.
- **JWT Token Revocation**: `tokenVersion` mechanism revokes all existing tokens on password change.
- **Profile Update Protection**: Restricted fields to prevent mass assignment vulnerabilities.
- **Rate Limiting**: Auth endpoints protected against brute force attacks.
- **Patient Identifier Privacy**: Patient identifiers in local case index are SHA-256 hashed.
- **Endpoint Protection**: All SNOMED and staging endpoints require authentication.

### Encryption Architecture
- **XChaCha20-Poly1305 AEAD**: All local case data encrypted.
- **Envelope Format**: `enc:v1:nonce:ciphertext` for version identification.
- **Backward Compatibility**: Legacy XOR-encrypted data automatically re-encrypted.
- **Key Derivation**: Device encryption key derived from user passphrase using scrypt.

### End-to-End Encryption Scaffolding
- **Per-Device Key Pairs**: Each device generates X25519 key pair stored securely.
- **Device Key Registration**: Public keys registered with server.
- **Key Registry API**: Server stores device public keys and metadata.
- **Key Revocation**: Devices can be remotely revoked.
- **Case Key Wrapping**: Infrastructure for wrapping symmetric case keys with recipient public keys.

### Email Configuration
- **Email Provider**: Resend integration for transactional emails.
- **From Address**: noreply@drgladysz.com.
- **Email Types**: Password reset and welcome emails with branded HTML templates.

## External Dependencies

### Database
- **PostgreSQL**: Used for SNOMED CT reference data, managed via Drizzle ORM.
- **AsyncStorage**: Primary mechanism for local data persistence on the device.
- **Performance Indexes** (`migrations/add_performance_indexes.sql`): 8 indexes on high-frequency query paths — procedures (user_id, user_id+date), flaps (procedure_id), anastomoses (flap_id), case_procedures (case_id), password_reset_tokens (expires_at), snomed_ref (category+is_active), user_facilities (user_id). All use `IF NOT EXISTS` for idempotent execution.

### Encrypted Media Storage
- **Encrypted Photo Storage**: Photos are encrypted with XChaCha20-Poly1305 and stored in AsyncStorage as individual entries (`@surgical_logbook_media_[uuid]`). No filesystem dependency — works on all platforms including TestFlight standalone builds.
- **Image Picker base64**: All image picker calls use `base64: true` to get image data directly without filesystem operations.
- **URI scheme**: Encrypted media stored with `encrypted-media:[uuid]` URIs in case data. `EncryptedImage` component handles async decryption with in-memory caching.
- **Backward compatibility**: `EncryptedImage` passes through non-encrypted URIs (legacy `file://` paths) directly.
- **All intake paths covered**: `OperativeMediaSection`, `MediaCapture`, `AddOperativeMediaScreen`, and `MediaManagementScreen` all encrypt media via `client/lib/mediaStorage.ts`.
- **Cleanup on delete**: `deleteCase()` in storage.ts removes associated encrypted media entries. Individual photo removal also cleans up.
- **Pending base64 pattern**: For the AddOperativeMedia navigation flow, base64 data is held in a module-level store (`setPendingBase64`/`consumePendingBase64`) to avoid passing large strings through navigation params.

### iOS Permissions
- **expo-image-picker plugin**: Configured in `app.json` with custom `photosPermission` and `cameraPermission` strings for iOS Info.plist.

### Edit Mode (CaseFormScreen)
- **Clinical details round-trip**: Edit mode restores `clinicalDetails`, `recipientSiteRegion`, and `anastomoses` from existing case data.
- **Save payload**: Uses actual `clinicalDetails` state (not `{} as any`), preserving all clinical data through edits.
- **Draft isolation**: Draft loading is skipped entirely in edit mode (`isEditMode` guard) to prevent race conditions.
- **Unconditional setters**: All field setters use `?? ""` / `?? defaultValue` instead of conditional `if`, ensuring cleared fields persist correctly.
- **Header save ref pattern**: `handleSaveRef.current` always points to the latest `handleSave` closure, so the header button never captures stale state.

### DatePickerField (FormField.tsx)
- **Clear button**: Moved to sibling Pressable (not nested inside date button) to prevent event bubbling that reopened the picker after clearing.

### Case Detail Display (CaseDetailScreen)
- **Per-procedure flap details**: Enhanced to show perforatorCount, elevationPlane, composition, isFlowThrough, skinIsland.
- **Legacy section removed**: Old top-level `caseData.clinicalDetails` display section deleted (read from wrong data path).
- **Recipient site laterality**: Displayed as prefix to recipient site region (e.g., "Left lower leg").

### Free Flap Laterality (ProcedureClinicalDetails)
- **Recipient site laterality**: New `recipientSiteLaterality` field added to `FreeFlapDetails` type.
- **Segmented button UI**: Both Harvest Side and Recipient Side use filled segmented buttons (matching Stay Type / Admission Urgency pattern) instead of outline pill SelectFields. Displayed side-by-side in a row.

### Diagnosis Group Editor
- **Collapsible groups**: Multi-diagnosis groups collapse to a compact summary card (specialty + diagnosis + procedure count). Auto-expanded when no diagnosis selected.
- **Free flap initialization**: Auto-created free flap procedures from diagnosis suggestions now include initialized `clinicalDetails` (flapType, SNOMED codes, harvest side, indication, empty anastomoses).

### Anastomosis UI (AnastomosisEntryCard)
- **Segmented buttons**: Technique (vein) and Configuration fields use segmented button groups instead of PickerField dropdowns.
- **Coupler constraint**: Selecting "Coupler" auto-sets configuration to "End-to-End" and locks other options (dimmed at 35% opacity). Constraint also enforced on initial load via useEffect.

### Key Libraries
- **expo-image-picker**: For selecting images from the gallery (with `base64: true`). Plugin configured in app.json for iOS permissions.
- **@noble/ciphers**: XChaCha20-Poly1305 authenticated encryption.
- **@noble/hashes**: SHA-256, scrypt, HKDF.
- **@noble/curves**: X25519 elliptic curve for E2EE key exchange.