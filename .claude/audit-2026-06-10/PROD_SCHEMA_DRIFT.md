# Prod schema drift audit — 2026-06-11

_Method: built a clean reference DB from `shared/schema.ts` via `drizzle-kit push`, then diffed `information_schema.columns` + `pg_indexes` of prod (read-only) against it. Row counts taken at audit time._

## TL;DR

Prod was last fully pushed in an early generation of the team-sharing schema. Yesterday's `case_assessments`/`assessment_key_envelopes` fix was the tip of the iceberg — the **same drift generation breaks two more live features**:

- 🔴 **E2EE case sharing has never worked in prod.** `shared_cases` is the old shape (`encrypted_blob`, `revoked_at`; missing `case_id`, `encrypted_shareable_blob`, `verification_note`; `recipient_role` varchar(20) default `'viewer'` vs varchar(30) no-default) and `case_key_envelopes` is the old shape (`encrypted_case_key` instead of `recipient_user_id` + `envelope_json`). Every `POST /api/share` insert fails server-side; the client treats share failure as non-blocking, so it has been failing **silently**. 0 rows in both tables.
- 🔴 **Push notifications have never worked in prod.** `push_tokens` is the old shape (`token` instead of `expo_push_token` + `device_id` + `updated_at`; nullable `platform`). Token registration fails → 0 tokens → no pushes ever delivered. The new commit-reveal reveal-prompt flow leans on these.
- 🟡 `snomed_ref` missing `code_type` column + both indexes (0 rows — the reference-data endpoints return empty in prod; client has bundled fallbacks, and live SNOMED search uses Ontoserver, not this table).
- 🔵 Missing perf indexes on two tables **with data**: `password_reset_tokens_user_idx` (1 row), `user_facilities_user_idx` (9 rows). Additive, instant.
- 🔵 **6 legacy tables exist only in prod, all 0 rows**: `teams`, `team_members` (the `20260326_drop_legacy_teams.sql` migration was never applied to prod), plus `anastomoses`, `case_procedures`, `flaps`, `procedures` (pre-local-first era).
- ✅ Clean and aligned: `users`, `profiles`, `user_facilities` (cols), `user_device_keys`, `team_contacts`, `password_reset_tokens` (cols), `case_assessments`, `assessment_key_envelopes` (the latter two fixed 2026-06-11).
- ✅ Benign prod-only extras worth KEEPING: `idx_users_apple_user_id` (partial unique — good hardening schema.ts lacks), `case_assessments_assessor_idx`, `case_key_envelopes_shared_case_idx` (perf).

No table **with data** has any column drift. All destructive fixes target verifiably empty tables.

## Full diff

### Tables only in prod (all 0 rows)
`anastomoses` · `case_procedures` · `flaps` · `procedures` · `team_members` · `teams`

### Column drift (schema.ts tables)

| Table | Rows | Drift |
| --- | --- | --- |
| `shared_cases` | 0 | missing `case_id`, `encrypted_shareable_blob`, `verification_note`; extra `encrypted_blob`, `revoked_at`; `recipient_role` 20/'viewer' vs 30/none |
| `case_key_envelopes` | 0 | missing `recipient_user_id`, `envelope_json`; extra `encrypted_case_key` |
| `push_tokens` | 0 | missing `expo_push_token`, `device_id`, `updated_at`; extra `token`; `platform` nullable/no-default vs NOT NULL 'ios' |
| `snomed_ref` | 0 | missing `code_type` varchar(20) default 'sctid' |

### Index drift

| Table | Missing in prod | Extra in prod (keep) |
| --- | --- | --- |
| `shared_cases` | `shared_cases_case_idx`, `shared_cases_case_recipient_idx` (UNIQUE) | — |
| `case_key_envelopes` | `case_key_envelopes_recipient_device_idx` | `case_key_envelopes_shared_case_idx` |
| `push_tokens` | `push_tokens_user_device_idx` (UNIQUE) | `push_tokens_token_idx` (goes with rebuild) |
| `snomed_ref` | `snomed_ref_category_idx`, `snomed_ref_code_idx` | — |
| `password_reset_tokens` | `password_reset_tokens_user_idx` | — |
| `user_facilities` | `user_facilities_user_idx` | — |
| `users` | — | `idx_users_apple_user_id` (partial unique — KEEP) |
| `case_assessments` | — | `case_assessments_assessor_idx` (KEEP) |

## Proposed remediation (in safety order)

1. **Additive indexes on data tables** (zero risk): `CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ...; CREATE INDEX IF NOT EXISTS user_facilities_user_idx ...;`
2. **Rebuild the 4 empty feature tables** to canonical schema.ts DDL (restores case sharing + push notifications): drop `case_key_envelopes` then `shared_cases` (FK order), recreate both + `push_tokens` + `snomed_ref` with full FKs/indexes. Guard each drop with a row-count assertion inside the transaction.
3. **Drop the 6 empty legacy tables** (`DROP TABLE ... CASCADE`, same row-count guards).
4. **Follow-up (code, not DB)**: add `idx_users_apple_user_id` and `case_assessments_assessor_idx` to `shared/schema.ts` so the next `drizzle-kit push` doesn't propose dropping them; consider a `migrations/` snapshot or a routine scratch-vs-prod diff in CI to stop drift recurring.

Remediation SQL: `.claude/audit-2026-06-10/prod-drift-fix.sql` (row-count guards included).
