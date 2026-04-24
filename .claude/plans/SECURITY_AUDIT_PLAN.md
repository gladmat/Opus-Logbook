# Opus Security & Quality Remediation — Session Plan

Generated from the 2026-04-25 audit (5 parallel agents: server security, client crypto/E2EE, privacy/exfiltration, internal logic, supply chain). This plan groups ~80 findings into **6 focused sessions** plus an optional polish pass, sequenced so each session is self-contained, high-quality within a 1M-context window, and can ship independently as its own PR.

**Legend:** 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low · ✨ New feature request

---

## Session 1 — Server-side security (~1 day)

**Why first:** server auth/authZ holes are remotely exploitable *today*; every other fix layers on an already-hardened server. Server tests are fast (~5s), so high iteration velocity.

### Scope

| Item | Severity | Location |
|---|---|---|
| Assessment submit authZ — reject non-party | 🔴 | `server/routes.ts:2626-2709` |
| Assessment read authZ — reject non-party | 🔴 | `server/routes.ts:2712-2807` |
| Reorder `/history` before `/:sharedCaseId` | 🟠 | `server/routes.ts:2713,2811` |
| Strip `detail` field from Apple 5xx responses | 🟠 | `server/routes.ts:683-822` |
| Email normalisation + `lower(email)` unique index | 🟠 | `server/routes.ts:531,596,720,951`; new migration |
| Signup enumeration → "if available we'll email" | 🟠 | `server/routes.ts:533-537` |
| Discover endpoint rate limit | 🟡 | `server/routes.ts:2558-2618` |
| Apple-user account deletion via identityToken | 🟡 | `server/routes.ts:1057-1092` |
| Avatar filename randomisation + auth gate | 🟡 | `server/routes.ts:110-117, 1226`; `server/app.ts:281` |
| Avatar upload failure cleanup | 🟡 | `server/routes.ts:1199-1240` |
| `JWT_SECRET` production blocklist (reject `local-dev-*`) | 🟡 | `server/env.ts` |
| `conceptId` validation before URL interpolation | 🔵 | `server/snomedApi.ts:299-311` |
| `fullName` length clamp from Apple | 🔵 | `server/routes.ts:788-794` |
| Push notifications after `res.json` | 🔵 | `server/routes.ts:1882-1887` |
| Invitation rate limit + sender-email verification | 🟠 | `server/email.ts`; route handler |

### Deliverables
- 1 migration: `lower(email)` case-insensitive unique index + backfill conflict resolver
- 1 shared helper: `assertIsPartyOnSharedCase(userId, sharedCase)`
- 1 shared helper: `normalizeEmail(raw: string): string`
- New tests: assessment authZ (submit + read), email case-collision rejection, signup enumeration resistance
- All 24 existing server tests pass

### Out of scope
- `helmet` migration (Session 7 polish)
- `jose`/`jsonwebtoken` unification (Session 7 polish)
- Rate-limiter Redis store (scale-out concern, not a correctness issue yet)

---

## Session 2 — On-device crypto hardening (~1 day)

**Why second:** these fixes change key storage semantics. Before we touch save pipelines (Session 4) we want key handling to be correct. Also: Session 1 hardened the server attacker model; this session hardens the device attacker model.

### Scope

| Item | Severity | Location |
|---|---|---|
| Delete `legacyXorDecrypt` + silent-catch fallback (throw instead) | 🔴 | `client/lib/encryption.ts:62-79,145-177` |
| One-shot legacy-blob migration (version-flagged) | 🔴 | new `client/lib/migrations/xorToV1.ts` |
| `WHEN_UNLOCKED_THIS_DEVICE_ONLY` + `requireAuthentication` on every SecureStore call | 🔴 | ~8 call sites |
| Biometric unlock actually gates key release (not just UI flag) | 🔴 | `client/contexts/AppLockContext.tsx:121-157`; `client/lib/encryption.ts:25-53` |
| scrypt PIN (N=2^17, r=8, p=1) + random salt + backoff lockout | 🔴 | `client/lib/appLockStorage.ts:68-93` |
| JWT refresh single-flight mutex | 🟠 | `client/lib/auth.ts:111-148` |
| Inbox MMKV key 16 → 32 bytes | 🟠 | `client/lib/inboxStorage.ts:129` |
| X25519 keygen via `x25519.utils.randomPrivateKey()` | 🟠 | `client/lib/e2ee.ts:62-69,78` |
| Profile cache legacy-JSON fallback removal | 🟡 | `client/contexts/AuthContext.tsx:116-156` |
| `LAST_ACTIVE_USER_KEY` → SecureStore | 🟡 | `client/contexts/AuthContext.tsx:86` |
| `console.error` ciphertext redaction | 🟡 | `client/lib/encryption.ts:148` |
| `deleteAccount` SecureStore cleanup | 🔵 | `client/contexts/AuthContext.tsx` |
| Pin `@noble/ciphers` exactly (no caret) | 🔵 | `package.json` |

### Deliverables
- Migration runs once on boot; if user still has legacy blobs → decrypt with XOR, re-encrypt with v1, then rotate master key (defence against known-plaintext leak via shared key)
- New `client/lib/secureStorage.ts` thin wrapper that defaults to correct protection flags so no future caller forgets
- Lockout counter persisted + signed (resist clock rollback)
- Tests: PIN brute-force resistance (timing assertion), JWT refresh race (two parallel 401s → 1 refresh), migration idempotency

### Out of scope
- TOFU public-key pinning UI (Session 6 — needs design)
- `meta.json` encryption (Session 5)
- Decrypt LRU refcounting (Session 5)

---

## Session 3 — iOS/Android platform privacy (~½ day)

**Why third:** native config changes need an EAS dev-build cycle. Isolating them in one session means one build cycle, not five.

### Scope

| Item | Severity | Location |
|---|---|---|
| `NSFileProtectionComplete` default on app container | 🔴 | `app.json` ios.infoPlist, via expo-build-properties plugin |
| `NSURLIsExcludedFromBackupKey` on `opus-media/` directory | 🔴 | `client/lib/mediaFileStorage.ts` (set attribute on creation) |
| Android `allowBackup=false` + `backup_rules.xml` excluding AsyncStorage + MMKV | 🔴 | `app.json` android config |
| Locked-camera extension: share master key via `kSecAttrAccessGroup` Keychain; encrypt before write | 🔴 | `targets/opus-locked-camera/OpusLockedCameraExtension.swift:164-190` |
| Locked-camera: `.completeFileProtection` on `data.write` | 🔴 | same file |
| Orphan sweep for `LockedCameraPending/*.jpg` >7 days old | 🟠 | `client/lib/sharedCaptureIngress.ts` or app-boot hook |
| App-switcher privacy overlay on `AppState.inactive` | 🟠 | `client/App.tsx` — swap root to `OpusMark` view |
| `caseSummaryCache` + decryption caches cleared on `AppState.background` | 🟡 | `client/lib/storage.ts`, `client/lib/mediaDecryptCache.ts` |
| `NSAllowsLocalNetworking` gated to `__DEV__` builds | 🔵 | `app.json` / Info.plist |
| Scheme collision mitigation (add `opuslogbook://` secondary) | 🔵 | `app.json` |

### Deliverables
- One EAS internal-distribution build to verify iOS data-protection + backup-exclusion actually apply
- Manual verification: tombstone file in backup inspection, extension-file encryption check
- No new tests (platform config), but a short `docs/PLATFORM_PRIVACY.md` checklist for reviewers

### Out of scope
- App Group Keychain refactor for *other* keys (only locked-camera needs it)
- Certificate pinning (Session 7 polish)

---

## Session 4 — State / save-pipeline correctness (~1.5 days)

**Why fourth:** the heaviest TypeScript session. Needs the hardened crypto from Session 2 since save pipeline touches encryption.

### Scope — save / form / edit-mode

| Item | Severity | Location |
|---|---|---|
| Per-procedure team-role override remapping on reorder/delete | 🔴 (clinical integrity) | `client/hooks/useCaseForm.ts:989-1037,1753-1800` |
| Date-only `new Date()` sweep + ESLint no-restricted-syntax rule | 🔴 | ~40 call sites; `eslint.config.js` |
| Draft/episode race — compute episodeId pre-save | 🔴 | `client/hooks/useCaseForm.ts:2177-2189` |
| Edit-mode share revocation (diff old vs new recipients) | 🟠 | `client/hooks/useCaseForm.ts:2203-2283`; `sharingApi.ts` |
| Episode sequence atomicity (monotonic counter on episode) | 🟠 | `client/lib/episodeStorage.ts`; `useCaseForm.ts:1379-1998` |
| Inner try/catch for episode-link failures (don't duplicate-save) | 🟠 | `client/hooks/useCaseForm.ts:2182-2189,2344-2347` |
| `TOGGLE_MEMBER_PROCEDURE_PRESENCE` materialise full index set | 🟠 | `useCaseForm.ts:1013-1018` |
| Orphan inbox cleanup at app boot | 🟠 | `client/App.tsx` or `AuthContext` |
| Discovery service user-scoped AsyncStorage keys + clear on logout | 🟠 | `client/lib/discoveryService.ts:16-17` |
| `ADD_TEAM_MEMBER` dedup vs `operativeTeam.linkedUserId` | 🟠 | `useCaseForm.ts:929-934,2218-2221` |
| `resetForm` clears `roleDefaultsAppliedRef` | 🟡 | `useCaseForm.ts:1550-1576` |
| `admissionDate` auto-sync guards on empty | 🟡 | `useCaseForm.ts:883-893` |
| `buildDuplicateState` deep clone via `structuredClone` | 🟡 | `useCaseForm.ts:1165-1178` |
| `REORDER_DIAGNOSIS_GROUPS` renumbers procedure `sequenceOrder` | 🟡 | `useCaseForm.ts:1794-1800` |
| Episode state-machine validator | 🟡 | `client/lib/episodeStorage.ts:105-114` |
| `loadCaseIntoFormState` preserves `teamMembers` | 🔵 | `useCaseForm.ts:549` |
| Day-case outcome auto-fill in LOAD_CASE/LOAD_DRAFT paths | 🟡 | `useCaseForm.ts:869-875` |

### Deliverables
- New `client/lib/procedureStableId.ts` — stable ID on `CaseProcedure` so overrides don't depend on array index
- Migration helper: stamp existing cases with stable procedure IDs on first load
- ESLint rule: `no-restricted-syntax` catching `new Date(<literal>)` on files dealing with date-only values
- Tests: reorder-preserves-attribution (critical!), parallel-save-unique-sequence, edit-removes-shared-recipient, date-only parser fuzz
- All 1467 existing tests pass + ~20 new

### Out of scope
- Sharing-feature extension (Session 6)
- Media decrypt cache (Session 5)

---

## Session 5 — PHI exfiltration surface + share hygiene (~1 day)

**Why fifth:** smaller scope, isolated concerns. Can proceed after Session 4 lands.

### Scope

| Item | Severity | Location |
|---|---|---|
| `Share.share({message})` → `Sharing.shareAsync(fileUri, mimeType)` for CSV/FHIR/JSON | 🟠 | `client/lib/export.ts:38-66` |
| PDF temp file deleted after `Sharing.shareAsync` resolves | 🟠 | `client/lib/exportPdf.ts:12-17` |
| Export confirmation dialog: "This contains patient data" | 🟠 | same files |
| Avatar URL auth gate (authenticated stream or signed URL) | 🟠 | server + `client/lib/profileApi.ts` |
| Encrypted photo `meta.json` — encrypt or round `createdAt` to day | 🟠 | `client/lib/mediaFileStorage.ts:187-207` |
| Decrypt LRU cache refcounting (prevent use-after-evict) | 🟠 | `client/lib/mediaDecryptCache.ts:49-62` |
| Thumbnail temp cleanup sweep | 🔵 | `client/lib/thumbnailGenerator.ts` |
| `console.*` → `logger` shim, `__DEV__`-gated in prod | 🔵 | new `client/lib/logger.ts`; sweep |

### Deliverables
- Single export path that always writes-temp-then-share-then-delete
- Avatar served under `GET /api/profile/:id/avatar` with `authenticateToken`; old `/uploads/avatars/*` becomes 410 Gone (migrate existing URLs on profile read)
- `meta.json` v3 format: AEAD-encrypted with master key (backwards compatible: v2 still readable, new writes are v3)
- Tests: export golden-file (PDF stays out of cache after share), avatar 401 on anonymous GET

### Out of scope
- PSI discovery (complex; Session 7 polish or deferred)

---

## Session 6 — E2EE trust + share team details for non-Opus members (~1.5 days)

**Why sixth:** this is the most design-heavy session. Wants the new feature ✨ implementation plus the hardest remaining crypto item (TOFU).

### Scope

#### ✨ New feature — share full operative team with non-Opus members
Current state: `SharedCaseData.operativeTeam: CaseTeamMember[]` already exists, but receiver-side UI and helpers drop non-linked members in places. We will:

1. Extend `SharedCaseData` to include, per team member:
   - First name, last name (already there via `CaseTeamMember`)
   - Operative role (PS/FA/SS/US/SA per `TeamMemberOperativeRole`)
   - Per-procedure role overrides (`procedureRoleOverrides`)
   - Per-procedure presence (`presentForProcedures`)
   - Career stage / seniority tier (optional — for learning-curve context)
   - `linkedUserId` when present; `null` when contact is not on Opus
2. On receiver side: render the full team on `SharedCaseDetailScreen` regardless of `linkedUserId`. Display "(not on Opus)" badge for unlinked members.
3. Privacy guard: do **not** include `email` or `phone` of unlinked contacts in the blob — those belong to the sender's private contact book and must not travel to recipients (third-party PII principle).
4. Migration: existing shared blobs without enriched team metadata fall back to current render; new blobs get the richer format. Blob version bumped: `blobVersion: 2`.

**Files touched:** `client/types/sharing.ts`, `client/lib/buildShareableBlob.ts`, `client/screens/SharedCaseDetailScreen.tsx` (or wherever shared cases render), unit tests.

#### 🔴 E2EE trust — TOFU public-key pinning + safety-number screen

Current state: `getUserDeviceKeys` returns public keys; client encrypts to them with zero verification. Server compromise → silent key swap.

1. New `client/lib/keyPinningStore.ts` — encrypted AsyncStorage of first-observed `{userId → deviceId → publicKey → firstSeenAt}` tuples.
2. On every share / key wrap: check pin; on mismatch, refuse encrypt and surface a warning screen with a 6-group × 5-digit SHA-256 safety number derived from both parties' sorted pubkeys (Signal-style).
3. New settings screen: "Verify safety number with {contact}" — shows the number for out-of-band comparison and a "Mark verified" button.
4. On rotate: user must tap "I verified this change in person" to update the pin.

**Files touched:** new keypinning module, `client/lib/sharingApi.ts`, `client/lib/e2ee.ts`, new verification screen.

#### 🟠 Other items
- JWT refresh rotation (server-side `refresh_tokens` table with device binding + rotation on each use)
- Logout zeroises master key cache + SecureStore master key for the scoped user
- Blinded-assessment commit-reveal (scheme design: each party encrypts assessment to their own ephemeral key, commits hash; reveal releases ephemeral key when both have committed — deferred if scope bloats; can move to Session 7)

### Deliverables
- Blob version bump documented
- TOFU + safety-number UI manually tested on two devices
- Tests: key-mismatch rejects share, safety-number determinism, pin survives app restart, unlinked team member round-trips cleanly

### Out of scope
- PSI contact discovery (defer to polish)
- Full commit-reveal crypto if design slips (defer to polish)

---

## Session 7 — Polish, docs, config hygiene (~½ day)

**Why last:** small items that are easy to lose if bundled with a risky session.

### Scope

| Item | Severity | Location |
|---|---|---|
| Rotate production test-account passwords (out-of-band, by you) | 🟠 | Human action |
| Move test credentials out of CLAUDE.md to gitignored `TESTING.local.md` | 🟠 | `CLAUDE.md` |
| Migrate `jsonwebtoken` → `jose` everywhere; drop `jsonwebtoken` + `@types/jsonwebtoken` | 🟡 | `server/routes.ts` |
| Lint rule: every `jwt.verify` pins `algorithms` | 🟡 | `eslint.config.js` |
| `helmet@8` adoption; landing-page CSP separated from app CSP | 🟡 | `server/app.ts` |
| Rate-limiter: shared store (Postgres table or Redis) | 🟡 | `server/routes.ts:335-411` |
| PSI-style contact discovery (daily rotating salt + hashed set intersection) | 🟡 | `client/lib/discoveryService.ts`; `server/routes.ts:2558-2618` |
| Blinded-assessment commit-reveal (if deferred from Session 6) | 🟡 | `server/routes.ts:2626-2807`; `client/lib/assessmentApi.ts` |
| Delete `.replit`, `.node-version 2`, empty `uploads/` | 🔵 | repo root |
| `dist/` cleanup script / documentation | 🔵 | `scripts/` |
| `.claude/plans/SECURITY_AUDIT_PLAN.md` → check off all items | - | this file |

### Deliverables
- Release note summarising security improvements across all 7 sessions
- Updated `CLAUDE.md` reflecting final state (no stale promises)
- Fresh `npm audit` run; no high/critical outstanding

---

## Cross-session invariants

Applied consistently across every session:

1. **Every new function receiving a case, shared blob, or team member has a type-level invariant test.**
2. **Every SecureStore call** passes through the wrapper from Session 2 (no direct `expo-secure-store` imports outside the wrapper).
3. **Every `console.*` call in `client/lib/*`** is `__DEV__`-gated after Session 5.
4. **No regression:** `npm run test` and `npm run check:types` must both pass at the end of every session. CI-equivalent locally.
5. **Commit discipline:** one coherent commit per session, Claude co-author trailer, under 400-line diff on average (split PR if larger).

## Severity totals across all sessions

| Severity | Total | Session distribution |
|---|---|---|
| 🔴 Critical | 10 | S1 ×2 · S2 ×4 · S3 ×4 · S4 ×3 · S6 ×1 |
| 🟠 High | 22 | S1 ×6 · S2 ×3 · S3 ×2 · S4 ×6 · S5 ×6 · S6 ×2 |
| 🟡 Medium | 26 | S1 ×4 · S2 ×4 · S3 ×1 · S4 ×5 · S5 ×2 · S7 ×7 · rest |
| 🔵 Low / Info | 25 | distributed |
| ✨ New feature | 1 | S6 |

---

## Between-session handoff

At the **start** of each session:
1. Read this plan file
2. Read `CLAUDE.md`
3. Read the relevant audit-output file for the session's theme (see `/private/tmp/claude-501/.../tasks/*.output`)
4. Check what's already landed: `git log --oneline -20`

At the **end** of each session:
1. Update this plan — strike through completed items (or add ✅)
2. Append a short "Session N completed" note with the commit SHA
3. Flag any scope changes (items moved between sessions)
4. Run `npm run test` + `npm run check:types` + smoke-test on simulator
