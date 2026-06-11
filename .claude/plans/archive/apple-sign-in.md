# Plan: Implement Sign in with Apple (Full Stack)

## Overview
Add Apple Sign In as the primary auth method. Server verifies Apple identity tokens via JWKS, client uses `expo-apple-authentication`.

## Changes

### 1. Install dependencies
- **Server:** `jose` (lightweight JWT/JWKS verification, already ESM-friendly, no native deps)
- **Client:** `expo-apple-authentication` via `npx expo install`

### 2. Schema change (`shared/schema.ts`)
Add `appleUserId` column to `users` table:
```typescript
appleUserId: text("apple_user_id"),
```
- Nullable (existing email users won't have it)
- Unique constraint for lookup

### 3. Storage layer (`server/storage.ts`)
Add new method to `IStorage` interface and `DatabaseStorage`:
```typescript
getUserByAppleId(appleUserId: string): Promise<User | undefined>
```
Simple query: `SELECT * FROM users WHERE apple_user_id = ?`

### 4. Server endpoint (`server/routes.ts`)
New `POST /api/auth/apple` endpoint (rate-limited):

1. Accept `{ identityToken, fullName?, email? }`
2. Verify identity token using `jose`:
   - Fetch Apple JWKS from `https://appleid.apple.com/auth/keys` (via `createRemoteJWKSet`)
   - `jwtVerify(identityToken, jwks, { issuer: 'https://appleid.apple.com', audience: 'com.drgladysz.opus' })`
3. Extract `sub` (Apple user ID) from verified payload
4. Look up user by `appleUserId`:
   - **Found:** Issue JWT token, return auth response (same as login)
   - **Not found:** Create new user:
     - Email from token `email` claim or request body (may be null — Apple relay/hidden)
     - Generate random password hash (user won't use password login, but column is NOT NULL)
     - Set `appleUserId` on user record
     - Create empty profile with `onboardingComplete: false`
     - Optionally populate profile `firstName`/`lastName` from `fullName` body param
     - Issue JWT, return auth response (same as signup)

### 5. Client auth helper (`client/lib/auth.ts`)
Add `appleSignIn()` function:
```typescript
export async function appleSignIn(
  identityToken: string,
  fullName?: { givenName?: string; familyName?: string } | null,
  email?: string | null,
): Promise<AuthResponse>
```
POST to `/api/auth/apple`, store token on success.

### 6. Auth context (`client/contexts/AuthContext.tsx`)
Add `appleLogin` function to context:
- Calls `appleSignIn()` from auth.ts
- Sets user/profile/facilities state (same pattern as `login`)
- Runs storage migration + inbox init
- Registers device key
- Expose via `AuthContextType` interface

### 7. Auth screen UI (`client/screens/AuthScreen.tsx`)
Add Apple Sign In button:
- Check `AppleAuthentication.isAvailableAsync()` → only render if available
- Place native `AppleAuthenticationButton` above email form, separated by "or" divider
- `handleAppleSignIn`:
  - `AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME, EMAIL] })`
  - Extract `identityToken`, `fullName`, `email` from credential
  - Call `appleLogin()` from context
  - Error handling via Alert

### 8. App config (`app.json`)
Add:
- `"usesAppleSignIn": true` under `expo.ios`
- `"expo-apple-authentication"` to plugins array

### 9. Database migration
Add SQL migration file for the `apple_user_id` column:
```sql
ALTER TABLE users ADD COLUMN apple_user_id TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS users_apple_user_id_idx ON users (apple_user_id);
```
Then run `npm run db:push` to sync.

## File changes summary
| File | Action |
|------|--------|
| `package.json` | Add `jose` to devDependencies |
| `shared/schema.ts` | Add `appleUserId` column to `users` |
| `server/storage.ts` | Add `getUserByAppleId()` method |
| `server/routes.ts` | Add `POST /api/auth/apple` endpoint |
| `client/lib/auth.ts` | Add `appleSignIn()` function |
| `client/contexts/AuthContext.tsx` | Add `appleLogin` to context |
| `client/screens/AuthScreen.tsx` | Add Apple Sign In button + handler |
| `app.json` | Add `usesAppleSignIn` + plugin |
| `migrations/` | New SQL migration for `apple_user_id` |

## Not changing
- No changes to existing login/signup flows
- No changes to JWT token format or expiry
- No changes to password reset (Apple users can't reset password — they just sign in again)
- Account deletion for Apple users will work (no password check needed — separate concern for later)
