-- Migration: team-contact linking identifiers (2.26.0)
--
-- Rationale: colleague matching only ever worked by email. Phones were
-- compared as raw strings (and `profiles.phone` was never even writable),
-- registration-number matching was stubbed, and nothing stopped a contact
-- from being linked to its own owner or two contacts from linking to the
-- same account. This migration:
--
--   1. adds `profiles.registration_lookup_keys text[]` — denormalised
--      `reg:<jurisdiction>:<UPPERALNUM>` keys derived from
--      `professional_registrations` (+ the legacy `medical_council_number`),
--      backfilled here and maintained by the server on every profile write;
--      GIN-indexed so `@> ARRAY[key]` lookups and PSI member-set builds are
--      index scans. The normalisation MUST equal
--      shared/professionalRegistrations.ts `normalizeRegistrationNumber`.
--   2. constrains `profiles.phone` to E.164 (light cleanup + pre-flight,
--      then CHECK + partial index). The column has never been written by
--      any client, so it is expected to be empty.
--   3. lightly cleans `team_contacts.phone` (no CHECK — legacy national
--      format values re-normalise on the next client save; the server
--      enforces E.164 on write from now on).
--   4. enforces the registration number/jurisdiction pair on team_contacts.
--   5. nulls out self-links and adds a CHECK.
--   6. pre-flights duplicate (owner, linked_user) pairs, then adds a partial
--      UNIQUE index.
--
-- Idempotent: every step is IF NOT EXISTS / DROP-then-ADD / WHERE-guarded.
-- Pre-flight RAISEs abort the whole transaction with a message that names
-- the rows to fix; nothing is left half-applied.

BEGIN;

-- ── 1. profiles.registration_lookup_keys ────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS registration_lookup_keys text[] NOT NULL DEFAULT '{}'::text[];

-- Backfill from the JSONB map (jurisdiction key → typed number).
UPDATE profiles p
SET registration_lookup_keys = COALESCE(
  (
    SELECT array_agg(DISTINCT
      'reg:' || e.key || ':' || upper(regexp_replace(e.value, '[^A-Za-z0-9]', '', 'g'))
      ORDER BY 'reg:' || e.key || ':' || upper(regexp_replace(e.value, '[^A-Za-z0-9]', '', 'g'))
    )
    FROM jsonb_each_text(COALESCE(p.professional_registrations, '{}'::jsonb)) e
    WHERE e.key IN (
      'new_zealand','australia','canada','germany','poland',
      'austria','switzerland','united_kingdom','united_states','other'
    )
    AND regexp_replace(e.value, '[^A-Za-z0-9]', '', 'g') <> ''
  ),
  '{}'::text[]
);

-- Legacy fallback: profiles with only medical_council_number resolve it to
-- the country's jurisdiction (mirrors getRegistrationJurisdictionForCountry,
-- incl. the switzerland case fixed in the same release), else 'other'.
UPDATE profiles
SET registration_lookup_keys = ARRAY[
  'reg:' ||
  CASE country_of_practice
    WHEN 'new_zealand'    THEN 'new_zealand'
    WHEN 'australia'      THEN 'australia'
    WHEN 'canada'         THEN 'canada'
    WHEN 'germany'        THEN 'germany'
    WHEN 'poland'         THEN 'poland'
    WHEN 'austria'        THEN 'austria'
    WHEN 'switzerland'    THEN 'switzerland'
    WHEN 'united_kingdom' THEN 'united_kingdom'
    WHEN 'united_states'  THEN 'united_states'
    ELSE 'other'
  END
  || ':' || upper(regexp_replace(medical_council_number, '[^A-Za-z0-9]', '', 'g'))
]
WHERE cardinality(registration_lookup_keys) = 0
  AND regexp_replace(COALESCE(medical_council_number, ''), '[^A-Za-z0-9]', '', 'g') <> '';

CREATE INDEX IF NOT EXISTS profiles_registration_lookup_keys_gin_idx
  ON profiles USING gin (registration_lookup_keys);

-- ── 2. profiles.phone → E.164 ───────────────────────────────────────────────

-- Light cleanup: drop whitespace/punctuation, "00" international prefix → "+".
UPDATE profiles
SET phone = NULLIF(regexp_replace(
      CASE WHEN phone ~ '^00' THEN '+' || substr(phone, 3) ELSE phone END,
      '[\s().-]', '', 'g'), '')
WHERE phone IS NOT NULL;

-- Pre-flight: anything left that isn't E.164 must be fixed by hand (there
-- is no reliable way to infer a country code in SQL). Expected count: 0 —
-- no client has ever written this column.
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT count(*) INTO bad_count
  FROM profiles
  WHERE phone IS NOT NULL AND phone !~ '^\+[1-9][0-9]{1,14}$';
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'profiles.phone has % non-E.164 value(s). Fix or NULL them (SELECT id, user_id, phone FROM profiles WHERE phone !~ ''^\+[1-9][0-9]{1,14}$'') and re-run.', bad_count;
  END IF;
END $$;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_is_e164;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_phone_is_e164
  CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$');

CREATE INDEX IF NOT EXISTS profiles_phone_idx
  ON profiles (phone) WHERE phone IS NOT NULL;

-- ── 3–6. team_contacts (guarded: the table may not exist on a stale dev DB)

DO $$
DECLARE
  dup_count int;
BEGIN
  IF to_regclass('public.team_contacts') IS NULL THEN
    RETURN;
  END IF;

  -- 3. Light phone cleanup only. Values that remain in national format
  --    ("0211234567") stay as-is: they never matched before, and the client
  --    re-normalises them with the owner's region on the next save.
  UPDATE team_contacts
  SET phone = NULLIF(regexp_replace(
        CASE WHEN phone ~ '^00' THEN '+' || substr(phone, 3) ELSE phone END,
        '[\s().-]', '', 'g'), '')
  WHERE phone IS NOT NULL;

  -- 4. Registration pair: number without jurisdiction → 'other';
  --    jurisdiction without number → NULL.
  UPDATE team_contacts
  SET registration_jurisdiction = 'other'
  WHERE registration_number IS NOT NULL AND registration_jurisdiction IS NULL;
  UPDATE team_contacts
  SET registration_jurisdiction = NULL
  WHERE registration_number IS NULL AND registration_jurisdiction IS NOT NULL;

  EXECUTE 'ALTER TABLE team_contacts DROP CONSTRAINT IF EXISTS team_contacts_registration_pair';
  EXECUTE 'ALTER TABLE team_contacts ADD CONSTRAINT team_contacts_registration_pair '
       || 'CHECK ((registration_number IS NULL) = (registration_jurisdiction IS NULL))';

  -- 5. Self-links are always wrong (the share pipeline rejects self-share
  --    on every save). Clear them, then forbid them.
  UPDATE team_contacts
  SET linked_user_id = NULL, link_confirmed_at = NULL, updated_at = now()
  WHERE linked_user_id IS NOT NULL AND linked_user_id = owner_user_id;

  EXECUTE 'ALTER TABLE team_contacts DROP CONSTRAINT IF EXISTS team_contacts_not_self_linked';
  EXECUTE 'ALTER TABLE team_contacts ADD CONSTRAINT team_contacts_not_self_linked '
       || 'CHECK (linked_user_id IS NULL OR linked_user_id <> owner_user_id)';

  -- 6. Duplicate links: pre-flight, then partial UNIQUE index.
  SELECT count(*) INTO dup_count FROM (
    SELECT owner_user_id, linked_user_id
    FROM team_contacts
    WHERE linked_user_id IS NOT NULL
    GROUP BY owner_user_id, linked_user_id
    HAVING count(*) > 1
  ) d;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'team_contacts has % (owner_user_id, linked_user_id) duplicate group(s). '
      'Keep the newest link per pair and unlink the rest, e.g.: '
      'UPDATE team_contacts t SET linked_user_id = NULL, link_confirmed_at = NULL '
      'WHERE linked_user_id IS NOT NULL AND id <> (SELECT id FROM team_contacts u '
      'WHERE u.owner_user_id = t.owner_user_id AND u.linked_user_id = t.linked_user_id '
      'ORDER BY link_confirmed_at DESC NULLS LAST, created_at DESC LIMIT 1); then re-run.',
      dup_count;
  END IF;

  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS team_contacts_owner_linked_uniq '
       || 'ON team_contacts (owner_user_id, linked_user_id) WHERE linked_user_id IS NOT NULL';
END $$;

COMMIT;
