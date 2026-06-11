-- Prod schema drift remediation — 2026-06-11
-- See PROD_SCHEMA_DRIFT.md for the audit. Every destructive statement is
-- guarded by a row-count assertion: if any targeted table has gained rows
-- since the audit, the whole transaction aborts.

BEGIN;

-- ── Guard: abort if any rebuild/drop target has rows ─────────────────────────
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shared_cases','case_key_envelopes','push_tokens','snomed_ref',
    'teams','team_members','anastomoses','case_procedures','flaps','procedures'
  ] LOOP
    EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
    IF n > 0 THEN
      RAISE EXCEPTION 'ABORT: table % has % rows — manual review required', t, n;
    END IF;
  END LOOP;
END $$;

-- ── 1. Additive indexes on tables WITH data (safe) ───────────────────────────
CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS user_facilities_user_idx
  ON user_facilities (user_id);

-- ── 2. Rebuild empty feature tables to canonical schema.ts shape ─────────────
-- Restores E2EE case sharing + push notifications (old shapes made every
-- insert fail silently).

-- case_assessments (fixed 2026-06-11, keep) holds an FK onto shared_cases —
-- detach it for the rebuild, re-attach with the canonical drizzle name below.
ALTER TABLE case_assessments
  DROP CONSTRAINT IF EXISTS case_assessments_shared_case_id_fkey;
ALTER TABLE case_assessments
  DROP CONSTRAINT IF EXISTS case_assessments_shared_case_id_shared_cases_id_fk;

DROP TABLE IF EXISTS case_key_envelopes; -- FK on shared_cases: drop first
DROP TABLE IF EXISTS shared_cases;
DROP TABLE IF EXISTS push_tokens;
DROP TABLE IF EXISTS snomed_ref;

CREATE TABLE shared_cases (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id varchar NOT NULL,
  owner_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_shareable_blob text NOT NULL,
  blob_version integer NOT NULL DEFAULT 1,
  recipient_role varchar(30) NOT NULL,
  verification_status varchar(20) NOT NULL DEFAULT 'pending',
  verification_note text,
  verified_at timestamp,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX shared_cases_owner_idx ON shared_cases (owner_user_id);
CREATE INDEX shared_cases_recipient_idx ON shared_cases (recipient_user_id);
CREATE INDEX shared_cases_case_idx ON shared_cases (case_id);
CREATE UNIQUE INDEX shared_cases_case_recipient_idx
  ON shared_cases (case_id, recipient_user_id);

ALTER TABLE case_assessments
  ADD CONSTRAINT case_assessments_shared_case_id_shared_cases_id_fk
  FOREIGN KEY (shared_case_id) REFERENCES shared_cases(id) ON DELETE CASCADE;

CREATE TABLE case_key_envelopes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_case_id varchar NOT NULL REFERENCES shared_cases(id) ON DELETE CASCADE,
  recipient_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_device_id varchar NOT NULL,
  envelope_json text NOT NULL,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX case_key_envelopes_recipient_device_idx
  ON case_key_envelopes (recipient_user_id, recipient_device_id);
-- prod-only perf extra, preserved intentionally:
CREATE INDEX case_key_envelopes_shared_case_idx
  ON case_key_envelopes (shared_case_id);

CREATE TABLE push_tokens (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token varchar NOT NULL,
  device_id varchar NOT NULL,
  platform varchar(10) NOT NULL DEFAULT 'ios',
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX push_tokens_user_idx ON push_tokens (user_id);
CREATE UNIQUE INDEX push_tokens_user_device_idx
  ON push_tokens (user_id, device_id);

CREATE TABLE snomed_ref (
  id serial PRIMARY KEY,
  snomed_ct_code varchar(50) NOT NULL,
  display_name text NOT NULL,
  common_name text,
  category varchar(50) NOT NULL,
  subcategory varchar(50),
  anatomical_region varchar(100),
  specialty varchar(50),
  code_type varchar(20) NOT NULL DEFAULT 'sctid',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX snomed_ref_code_idx ON snomed_ref (snomed_ct_code);
CREATE INDEX snomed_ref_category_idx ON snomed_ref (category);

-- ── 3. Drop empty legacy tables ──────────────────────────────────────────────
-- teams/team_members: migration 20260326_drop_legacy_teams.sql never reached
-- prod. anastomoses/case_procedures/flaps/procedures: pre-local-first era.
DROP TABLE IF EXISTS anastomoses CASCADE;
DROP TABLE IF EXISTS case_procedures CASCADE;
DROP TABLE IF EXISTS flaps CASCADE;
DROP TABLE IF EXISTS procedures CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

COMMIT;
