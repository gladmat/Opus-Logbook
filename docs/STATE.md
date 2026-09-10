# Opus — State Snapshot

Generated 2026-09-10 · regenerate with /state-snapshot

## App identity (`app.json`)

| Field | Value |
| --- | --- |
| Name / slug | Opus / `surgical-logbook` |
| Version | `2.25.0` |
| iOS bundle | `com.drgladysz.opus` |
| iOS buildNumber (app.json) | `11` — documentation only: `eas.json` sets `appVersionSource: "remote"`, so EAS overwrites it at build time (latest remote build number recorded in CLAUDE.md → Deployment → Version) |
| Android package / versionCode | `com.drgladysz.opus` / `1` (documentation only, same reason) |
| Apple Team ID | `8CQ38RR2W4` |
| EAS project ID | `0bc1b91c-c240-4f4e-b030-31d16389cd1e` |
| Expo owner | `gladmat` |

## EAS build profiles (`eas.json`)

- `appVersionSource`: `remote`
- `development` — `{"developmentClient": true, "distribution": "internal"}`
- `preview` — `{"distribution": "internal"}`
- `production` — `{"autoIncrement": true, "env": {"SENTRY_DISABLE_AUTO_UPLOAD": "true"}}`
- `submit.production.ios.ascAppId`: `6759992788`

## Repository

- Remote: `git@github.com:gladmat/Opus-Logbook.git`

## Dependency versions (`package.json`)

| Package | Range |
| --- | --- |
| expo | `^54.0.23` |
| react-native | `0.81.5` |
| react | `19.1.0` |
| drizzle-orm | `^0.45.2` |
| drizzle-kit | `^0.31.4` |
| typescript | `~5.9.2` |
| vitest | `^4.0.18` |

## Procedure categories (`client/constants/categories.ts`)

- Count: **11** — `breast, hand_wrist, head_neck, cleft_cranio, skin_cancer, orthoplastic, burns, lymphoedema, aesthetics, peripheral_nerve, general`
- **DEFECT (comment only):** the file comment claims 12 procedure categories but the array has 11 (Body Contouring merged into Aesthetics). Code intentional, comment stale.

## Specialty assessment modules (`client/components/**/*Assessment.tsx`)

```
client/components/acute-hand/AcuteHandAssessment.tsx
client/components/aesthetics/AestheticAssessment.tsx
client/components/breast/BreastAssessment.tsx
client/components/breast/BreastProgressiveAssessment.tsx
client/components/burns/BurnsAssessment.tsx
client/components/craniofacial/CraniofacialAssessment.tsx
client/components/dupuytren/DupuytrenAssessment.tsx
client/components/hand-elective/HandElectiveAssessment.tsx
client/components/hand-trauma/HandTraumaAssessment.tsx
client/components/lymphatic/LymphaticAssessment.tsx
client/components/peripheral-nerve/BrachialPlexusAssessment.tsx
client/components/peripheral-nerve/NeuromaAssessment.tsx
client/components/peripheral-nerve/PeripheralNerveAssessment.tsx
client/components/skin-cancer/SkinCancerAssessment.tsx
```

## Phase status (from `CLAUDE.md` → "v2.0 overhaul status")

Latest shipped: **2.25.0 (2026-09-10)** — Shared cases on the dashboard + E2EE photo transport + EPA audience fix (TestFlight build `1.2.89`; server changed → Railway redeployed with a new persistent `/data` volume, `UPLOADS_DIR=/data/uploads`, migration `20260910_shared_case_media.sql`).

COMPLETE milestones, in CLAUDE.md order: Phase 1 (form state refactor) · Phase 2 (Charcoal+Amber theme, card-based diagnosis groups) · Acute Hand Category · Phase 3 (inline validation, keyboard, haptics, duplicate, favourites) · Phase 4 (CSV/FHIR/PDF export, analytics) · Elective Hand + Joint Implant · Skin Cancer Terminology Repair · Media Overhaul · Capture Pipeline A–H · Media Encryption Remediation · Case Category Repair · Patient Identity · Operative Role & Supervision · UX Polish · Head & Neck Progressive Disclosure · Hand Elective UX + Dupuytren · Team Sharing Phases 1–8 · Facial & Peripheral Nerve Remediation 1–2 · Code Audit & Remediation · Per-Procedure Team Roles + EPA Targets · Build Health · Phase 5 (2.5.0 TestFlight) · Media Gallery Viewer · Forearm Tumour Diagnoses · JWT Auto-Refresh + Sharing Guardrails · Phase 6 / Security Remediation (2.6.0) · Phase 7 / Case Form UX Overhaul (2.7.0) · Phase 7.1 clusters 1+3+4 · 2026-06-10 Audit Remediation + 2.8.0 Security Hardening · 2026-07-13 Security Verification + Field/Time-Picker + UX Remediation · Media Crypto Speedup · DOB Typed Entry + Scalp Friction Burn + Staging Gate (2.9.0) · Multi-Format Report System · Enchondroma fixes · Onboarding Overhaul + App-Lock Hardening · Hand Laceration pathway (2.11.0) · Fixation Hardware + Bony Mallet · Carpal CRIF + CCS (2.12.0) · Hook of Hamate + Dermal Matrix · Team Sharing Linking Overhaul (2.13.0) · Per-Procedure Team + EPA Phases 1–3 (2.14.0) · Edit-Reshare Update-In-Place (2.15.0) · Follow-up Interval + Gallery Cleanup (2.16.0) · Multi-Region Recipient Site + X-ray Enhancement (2.17.0) · CTS + Cubital Tunnel Restoration (2.18.0) · Compartment Syndrome pathway (2.19.0) · Tenolysis + Photo Cap 50 + Multi-Lesion repair (2.20.0) · Media Date Integrity (2.21.0) · EPA Audit keyboard + supervisor visibility (2.22.0) · EPA Role-Gated Trigger + Instrument v2 + Phase C (2.23.0) · Free Flap Sheet harvest side + coupler fix (2.24.0) · Shared Cases on Dashboard + E2EE Photos + EPA Audience Fix (2.25.0).

## Duplicate SNOMED codes (`snomedCtCode:` fields, tests excluded)

- Codes reused across **≥ 2 non-test files: 65** (scan of `client/lib/` + `client/constants/`).
- `35646002`: **no cross-file collision** — appears in `client/lib/procedurePicklist.ts` only.
- Note: the raw duplicate scan is dominated by same-file reuse of generic codes (e.g. `122465003` Reconstruction procedure) and by the deliberate mirrors between `handTraumaMapping.ts` ↔ `handSurgeryDiagnoses.ts` and `skinCancerConfig.ts` ↔ `skinCancerDiagnoses.ts` — mostly legitimate; the actionable class is a code meaning two different things in two picklists.

## `// VERIFY` markers

```
11  client/lib/procedurePicklist.ts
10  client/lib/diagnosisPicklists/breastDiagnoses.ts
2   client/lib/diagnosisPicklists/orthoplasticDiagnoses.ts
total: 23
```

## Schema

- `pgTable(` definitions in `shared/schema.ts`: **13** (2.25.0 added `shared_case_media`).
- `ls migrations/*.sql | sort | tail -1` → `migrations/add_team_sharing_tables.sql` (alphabetical; un-dated legacy file). Latest **dated** migration: `migrations/20260910_shared_case_media.sql`.

<!-- BEGIN MANUAL SECTION — do not overwrite; edit by hand -->
### Manually-maintained facts

Values marked `[VERIFY]` were not corroborated from the repo; confirm against the
live external system before relying on them. Values resolved from code on
2026-07-24 are annotated `(confirmed: <source>)`.

**Infrastructure**
- Production API: `https://logbook-api.drgladysz.com` *(confirmed: `client/lib/query-client.ts:49` `PRODUCTION_API_URL`; the `api-server-production-4dd7.up.railway.app` host in CLAUDE.md is the raw Railway origin behind this custom domain)*
- Railway project name: `[VERIFY]` *(not in `railway.toml`)*
- Local API: `localhost:5001` *(confirmed: server default + test fixtures)*
- App Store Connect ID: `6759992788` *(confirmed: `eas.json` `submit.production.ios.ascAppId`)*
- DNS: `drgladysz.com` at panel.zenbox.pl; `opuslogbook.com` on Cloudflare Registrar `[VERIFY]`
- Landing page: live; waitlist → Railway API → PostgreSQL `[VERIFY]`

**Apple Developer**
- Account: `mateusz.gladysz@icloud.com` `[VERIFY]` *(not in repo)*
- Team ID: `8CQ38RR2W4` *(confirmed: `app.json` `ios.appleTeamId`)*
- Distribution cert + provisioning profile expire **Feb 2027** `[VERIFY]` *(not in repo)*

**Email**
- Resend (key stored on Railway as `RESEND_API_KEY` — value never recorded here)
- From: `noreply@drgladysz.com` *(confirmed: CLAUDE.md / `server/email.ts`)*

**Ontoserver (SNOMED CT verification)**
- Base URL `https://r4.ontoserver.csiro.au/fhir` *(confirmed: `server/snomedApi.ts:13`)*
- Edition CT-AU, content version `20260228` `[VERIFY current]` *(no edition/version pinned in code — `$expand` uses the server default)*

**Test accounts** (ephemeral staging/prod accounts — rotate regularly)
- Credentials live in gitignored `TESTING.local.md` (2 accounts: primary + secondary, with PIN). **Not committed here** — per the repo's 2.6.0 convention, test passwords stay out of tracked files. When uploading this file to the Claude.ai project knowledge, paste the accounts from `TESTING.local.md` into your private copy if your assistant needs them.

**Active threads / open items**
- `categories.ts` comment says "12 categories" but the array has 11 (Body
  Contouring merged into Aesthetics) — comment stale, code intentional. See the
  Procedure categories section above.
- On-device validation round owed for the 2.13.0 team-sharing linking flows.
- 23 `// VERIFY` SNOMED codes still outstanding (procedurePicklist ×11, breast ×10,
  orthoplastic ×2).
<!-- END MANUAL SECTION -->

> ⚠️ Upload docs/STATE.md to the Claude.ai project knowledge, replacing the old copy.
