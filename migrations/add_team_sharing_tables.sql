-- Team Sharing Tables (Phase 1)
-- Applied via drizzle-kit push; this file serves as documentation.

-- Shared cases: core record linking an owner's case to a recipient
CREATE TABLE IF NOT EXISTS shared_cases (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id VARCHAR NOT NULL,
  owner_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_shareable_blob TEXT NOT NULL,
  blob_version INTEGER NOT NULL DEFAULT 1,
  recipient_role VARCHAR(30) NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  verification_note TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS shared_cases_owner_idx ON shared_cases(owner_user_id);
CREATE INDEX IF NOT EXISTS shared_cases_recipient_idx ON shared_cases(recipient_user_id);
CREATE INDEX IF NOT EXISTS shared_cases_case_idx ON shared_cases(case_id);
CREATE UNIQUE INDEX IF NOT EXISTS shared_cases_case_recipient_idx ON shared_cases(case_id, recipient_user_id);

-- Per-device encryption key envelopes for shared cases
CREATE TABLE IF NOT EXISTS case_key_envelopes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_case_id VARCHAR NOT NULL REFERENCES shared_cases(id) ON DELETE CASCADE,
  recipient_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_device_id VARCHAR NOT NULL,
  envelope_json TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS case_key_envelopes_recipient_device_idx ON case_key_envelopes(recipient_user_id, recipient_device_id);

-- Blinded supervisor/trainee assessments
CREATE TABLE IF NOT EXISTS case_assessments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_case_id VARCHAR NOT NULL REFERENCES shared_cases(id) ON DELETE CASCADE,
  assessor_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessor_role VARCHAR(20) NOT NULL,
  encrypted_assessment TEXT NOT NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revealed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS case_assessments_shared_case_idx ON case_assessments(shared_case_id);
CREATE UNIQUE INDEX IF NOT EXISTS case_assessments_case_role_idx ON case_assessments(shared_case_id, assessor_role);

-- Encryption key envelopes for assessments (released when both parties submit)
CREATE TABLE IF NOT EXISTS assessment_key_envelopes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  case_assessment_id VARCHAR NOT NULL REFERENCES case_assessments(id) ON DELETE CASCADE,
  recipient_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_device_id VARCHAR NOT NULL,
  envelope_json TEXT NOT NULL,
  released BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS assessment_key_envelopes_recipient_released_idx ON assessment_key_envelopes(recipient_user_id, released);

-- Expo push notification token registry
CREATE TABLE IF NOT EXISTS push_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token VARCHAR NOT NULL,
  device_id VARCHAR NOT NULL,
  platform VARCHAR(10) NOT NULL DEFAULT 'ios',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_user_device_idx ON push_tokens(user_id, device_id);
