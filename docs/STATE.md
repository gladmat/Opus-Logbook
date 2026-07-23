# Opus — State Snapshot

Generated 2026-07-24 · regenerate with `/state-snapshot`

> Generated sections below are machine-derived from live repo sources. Do not
> hand-edit them — rerun `/state-snapshot`. Only the **Manually-maintained facts**
> section (bottom) is edited by hand and preserved across runs.

---

## App identity

Source: `app.json` (no `app.config.*` exists).

| Field | Value |
| --- | --- |
| Name | Opus |
| Slug | surgical-logbook |
| Version | 2.13.0 |
| iOS bundle ID | com.drgladysz.opus |
| iOS buildNumber | 11 *(documentation-only — see note)* |
| Android package | com.drgladysz.opus |
| Android versionCode | 1 *(documentation-only — see note)* |
| Apple Team ID | 8CQ38RR2W4 |
| EAS project ID | 0bc1b91c-c240-4f4e-b030-31d16389cd1e |
| Expo owner | gladmat |

> `eas.json` sets `appVersionSource: "remote"`, so `buildNumber` / `versionCode`
> in `app.json` are documentation-only — EAS overwrites them from its own counter
> at build time.

## EAS build profiles

Source: `eas.json`.

- **development** — `developmentClient: true`, `distribution: internal`
- **preview** — `distribution: internal`
- **production** — `autoIncrement: true`, env `SENTRY_DISABLE_AUTO_UPLOAD=true`
- **submit → production → ios** — `ascAppId: 6759992788`

## Repo remote

Source: `git remote -v`.

- `git@github.com:gladmat/Opus-Logbook.git` (HTTPS: `https://github.com/gladmat/Opus-Logbook`)

## Dependency versions

Source: `package.json`.

| Package | Version |
| --- | --- |
| expo | ^54.0.23 |
| react-native | 0.81.5 |
| react | 19.1.0 |
| drizzle-orm | ^0.45.2 |
| drizzle-kit | ^0.31.4 |
| typescript | ~5.9.2 |
| vitest | ^4.0.18 |

## Procedure categories

Source: `client/constants/categories.ts`.

- **Count: 11**
- `breast, hand_wrist, head_neck, cleft_cranio, skin_cancer, orthoplastic, burns, lymphoedema, aesthetics, peripheral_nerve, general`

> 🚩 **DEFECT — stale comment.** The file header comment reads "12 procedure
> categories — locked taxonomy" but the array has **11** entries. `body_contouring`
> was intentionally merged into `aesthetics` (per CLAUDE.md Aesthetics decisions),
> so the array is correct and the **comment is stale**. Not auto-fixed by this
> command (read-only w.r.t. source).

## Specialty assessment modules

Source: `client/components/**/*Assessment.tsx` (14 files).

`AcuteHandAssessment`, `AestheticAssessment`, `BreastAssessment`,
`BreastProgressiveAssessment`, `BurnsAssessment`, `CraniofacialAssessment`,
`DupuytrenAssessment`, `HandElectiveAssessment`, `HandTraumaAssessment`,
`LymphaticAssessment`, `BrachialPlexusAssessment`, `NeuromaAssessment`,
`PeripheralNerveAssessment`, `SkinCancerAssessment`.

## Phase status

Source: `CLAUDE.md` "v2.0 overhaul status".

- **Head: v2.13.0 shipped 2026-07-23** — Team Sharing Linking Overhaul (full 9-item
  plan, Phases 1–3) + Discoverable privacy toggle; also carried the held Hook of
  Hamate + Dermal Matrix pathways and the ORIF+CCS fix.
- Recent completed milestones: Carpal CRIF+CCS / **2.12.0** (2026-07-19), Fixation
  Hardware + Bony Mallet (2026-07-18), Hand Laceration pathway / **2.11.0**,
  Onboarding Overhaul + App-Lock Hardening, Multi-Format Report System / **2.10.0**,
  DOB Typed Entry + Staging Gate / **2.9.0**.
- All of Phases 1–7.1 COMPLETE; Security Remediation (**2.6.0**) + Security
  Hardening (**2.8.0**, PSI / commit-reveal / safety numbers / backup exclusion)
  COMPLETE; Media Crypto native speedup COMPLETE.

## Duplicate SNOMED report

Source: `snomedCtCode:` fields in `client/lib/` + `client/constants/` (tests excluded).

- **`35646002` collision: CONFIRMED.** Appears 10× within `procedurePicklist.ts`
  (generic "Excision of lesion of skin"); several are annotated `// VERIFY` or
  `// POST-COORDINATED: excision + scar`. Generic-code reuse, not necessarily a
  data-integrity bug.
- **60** distinct codes are reused across **≥2 non-test files** (the actionable
  cross-file class — same code in two specialty diagnosis lists, e.g. `105616000`
  orthoplastic+general, `189948006` peripheral_nerve+handSurgery, `254651007`
  skinCancer+headNeck).
- The raw scan is dominated by **legitimate same-file generic-code reuse** inside
  `procedurePicklist.ts` (e.g. `122465003` "Reconstruction procedure" ×26,
  `771225007` ×26, `286553006` ×19, `1202018003` ×18) and code↔test-file pairs —
  most duplicates are not defects.

## `// VERIFY` outstanding codes — 23 total

| Count | File |
| --- | --- |
| 11 | client/lib/procedurePicklist.ts |
| 10 | client/lib/diagnosisPicklists/breastDiagnoses.ts |
| 2 | client/lib/diagnosisPicklists/orthoplasticDiagnoses.ts |

## Database schema

Source: `shared/schema.ts` + `migrations/`.

- **Tables: 12** — `users`, `userDeviceKeys`, `passwordResetTokens`, `profiles`,
  `userFacilities`, `snomedRef`, `sharedCases`, `caseKeyEnvelopes`,
  `caseAssessments`, `assessmentKeyEnvelopes`, `pushTokens`, `teamContacts`.
- No explicit schema-version constant. **Latest migration:**
  `20260611_assessment_commit_reveal.sql` (9 SQL migrations total).

---

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

---

> ⚠️ Upload docs/STATE.md to the Claude.ai project knowledge, replacing the old copy.
