-- Migration: Align registry JSON storage columns with JSONB schema
-- Converts:
--   profiles.surgical_preferences: TEXT -> JSONB
--   procedure_outcomes.details:    TEXT -> JSONB
--
-- Safe parsing behavior:
--   - NULL / empty / invalid JSON text is coerced to '{}'
--   - Existing valid JSON text is preserved as JSONB

CREATE OR REPLACE FUNCTION _safe_parse_jsonb(input_text text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL OR btrim(input_text) = '' THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN input_text::jsonb;
EXCEPTION
  WHEN others THEN
    RETURN '{}'::jsonb;
END;
$$;

ALTER TABLE profiles
  ALTER COLUMN surgical_preferences
  TYPE jsonb
  USING _safe_parse_jsonb(surgical_preferences);

ALTER TABLE profiles
  ALTER COLUMN surgical_preferences
  SET DEFAULT '{}'::jsonb;

ALTER TABLE procedure_outcomes
  ALTER COLUMN details
  TYPE jsonb
  USING _safe_parse_jsonb(details);

ALTER TABLE procedure_outcomes
  ALTER COLUMN details
  SET DEFAULT '{}'::jsonb;

DROP FUNCTION _safe_parse_jsonb(text);
