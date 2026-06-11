-- Commit-reveal blinded assessments.
--
-- Phase 1 (commit): the client submits only a SHA-256 commitment of its
-- assessment; no ciphertext or key envelopes reach the server.
-- Phase 2 (reveal): once BOTH parties have committed (or 72h elapsed), each
-- client uploads the E2EE ciphertext + envelopes; mutual upload triggers the
-- existing reveal/release flow. The commitment nonce travels inside the E2EE
-- blob so the counterpart can verify content integrity after decryption.
--
-- All changes are additive/nullable; legacy rows (encrypted_assessment set,
-- commitment NULL) keep working on the legacy instant-submit path.

ALTER TABLE case_assessments
  ALTER COLUMN encrypted_assessment DROP NOT NULL;

ALTER TABLE case_assessments
  ADD COLUMN IF NOT EXISTS commitment varchar(64);

ALTER TABLE case_assessments
  ADD COLUMN IF NOT EXISTS committed_at timestamp;
