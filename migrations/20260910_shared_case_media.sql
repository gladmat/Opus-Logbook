-- Encrypted shared-case media ledger (2.25.0).
--
-- Photos on a shared case travel as the owner's existing AES-256-GCM
-- ciphertext files, uploaded once per (case, media, variant) to the uploads
-- volume at {UPLOADS_DIR}/shared-media/{owner_user_id}/{case_id}/{media_id}.{variant}.enc.
-- The per-image key never reaches the server: it rides inside the
-- end-to-end-encrypted share blob, which is already wrapped to each
-- recipient device. This table only tracks existence, byte size and the
-- AES-GCM auth tag so the owner can reconcile what is uploaded and the
-- server can clean up on last-share revoke / account deletion.
--
-- case_id is a client-side id that is only unique per owner, hence the
-- composite primary key. Additive: no existing table changes.

CREATE TABLE IF NOT EXISTS shared_case_media (
  owner_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id       varchar(64) NOT NULL,
  media_id      varchar(64) NOT NULL,
  variant       varchar(8)  NOT NULL,
  byte_size     integer     NOT NULL,
  auth_tag      varchar(32),
  created_at    timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT shared_case_media_pkey PRIMARY KEY (owner_user_id, case_id, media_id, variant),
  CONSTRAINT shared_case_media_variant_check CHECK (variant IN ('thumb', 'image'))
);

CREATE INDEX IF NOT EXISTS shared_case_media_owner_case_idx
  ON shared_case_media (owner_user_id, case_id);
