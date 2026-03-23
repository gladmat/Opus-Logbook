-- Add Apple Sign In support: apple_user_id column on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_apple_user_id_idx ON users (apple_user_id) WHERE apple_user_id IS NOT NULL;
