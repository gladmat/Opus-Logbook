-- Migration: enforce lowercase emails across users + team_contacts
-- Rationale: prior to this change, emails were stored case-sensitively in
-- `users.email` (with a UNIQUE constraint) and in `team_contacts.email`.
-- That allowed `Foo@Example.com` and `foo@example.com` to create two distinct
-- user accounts, and prevented case-insensitive matching between signups and
-- pending team-contact invitations. The server now normalises every email
-- to lowercase + trim at every entry point (signup, login, Apple, password
-- reset, user search, discovery, team contacts, invitations). This migration
-- backfills the existing data and adds a CHECK constraint as defence in
-- depth against any future code path that bypasses the helper.
--
-- Pre-flight: fails if any case-collisions already exist. If this migration
-- errors out with a "duplicate key" message, resolve the collision manually
-- by merging / deleting the offending accounts, then re-run.

BEGIN;

-- Abort early if a case-only collision would cause the UPDATE to fail.
-- This surfaces a clear error before the partial UPDATE runs.
DO $$
DECLARE
  collision_count int;
BEGIN
  SELECT count(*) INTO collision_count FROM (
    SELECT lower(email) AS e, count(*) AS c
    FROM users
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) d;
  IF collision_count > 0 THEN
    RAISE EXCEPTION 'users.email has % case-insensitive duplicate group(s). Resolve before migrating.', collision_count;
  END IF;
END $$;

-- Backfill users.email → lower(email). The existing UNIQUE constraint on
-- users.email will not trigger because we pre-checked for collisions above.
UPDATE users
SET email = lower(email)
WHERE email <> lower(email);

-- Backfill team_contacts.email → lower(email). No unique constraint to worry
-- about; NULL rows skipped by the predicate.
UPDATE team_contacts
SET email = lower(email)
WHERE email IS NOT NULL AND email <> lower(email);

-- Defence in depth: reject any future insert/update that stores a mixed-case
-- email. CHECK (email = lower(email)) passes when email IS NULL, which is
-- what we want for team_contacts (email column is optional).
ALTER TABLE users
  ADD CONSTRAINT users_email_is_lowercase
  CHECK (email = lower(email));

ALTER TABLE team_contacts
  ADD CONSTRAINT team_contacts_email_is_lowercase
  CHECK (email IS NULL OR email = lower(email));

COMMIT;
