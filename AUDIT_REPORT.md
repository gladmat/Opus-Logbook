# Opus Logbook — Comprehensive Architecture Audit Report

**Date:** 2026-03-11
**Scope:** Full codebase audit — client, server, types, data flow, tests, documentation
**Test baseline:** 705 tests, all passing (1.42s)

---

## Executive Summary

Opus is a well-architected, production-quality codebase with strong type safety, good security patterns, and a comprehensive feature set. The audit identified **87 issues** across 6 categories. No show-stoppers prevent a TestFlight release, but several medium-priority items should be addressed in the v2.1 cycle.

**Overall grade: B+** — Strong fundamentals, needs polish in test coverage, documentation accuracy, and storage layer decomposition.

### Issue Distribution

| Severity | Count | Category |
|----------|-------|----------|
| Critical | 5 | Camera race condition, error boundaries, encryption queue, storage migration, form state |
| High | 12 | Rate limiter, IP detection, inbox cleanup, deep linking, async cancellation |
| Medium | 35 | File splitting, cache bounds, error handling consistency, CLAUDE.md inaccuracies |
| Low | 20 | Naming, minor dead code, logging levels |
| Test gaps | 15 | Missing test suites for critical paths |

---

## 1. Architecture & Code Quality

### 1.1 Strengths

- **Type safety**: Strict TypeScript throughout, 297 type exports across 14 well-organized files, no `any` usage
- **Security**: XChaCha20-Poly1305 AEAD for case data, AES-256-GCM per-image DEK, HMAC-SHA256 patient hashing, IDOR-safe server
- **Offline-first**: Encrypted AsyncStorage with draft auto-save, lazy migration on load
- **Split context pattern**: CaseFormStateContext + CaseFormDispatchContext prevents unnecessary re-renders
- **Navigation type safety**: All 26 routes have typed params in `RootStackParamList`
- **Crypto tests use real implementations**: AES-256-GCM round-trips tested with actual `@noble/ciphers`

### 1.2 Oversized Files (Split Candidates)

| File | Lines | Recommendation |
|------|-------|----------------|
| `procedurePicklist.ts` | 5,633 | Split into `procedureData.ts` (static data) + `procedureQueries.ts` (search/filter) |
| `useCaseForm.ts` | 1,948 | Extract reducer into `caseFormReducer.ts`, validation into `caseFormValidation.ts` |
| `handTraumaMapping.ts` | 1,722 | Data file — acceptable size given it's pure mappings |
| `CaseFormScreen.tsx` | 1,591 | Extract save logic into `useCaseSave.ts` hook |
| `handTraumaDiagnosis.ts` | 1,602 | Data file — acceptable |
| `skinCancerConfig.ts` | 1,260 | Split into `skinCancerMargins.ts` + `skinCancerPathology.ts` + `skinCancerValidation.ts` |
| `storage.ts` | 1,160 | Split into `caseStorage.ts` + `draftStorage.ts` + `caseIndex.ts` |
| `CaseDetailScreen.tsx` | 1,209 | Extract section renderers into sub-components |

**Impact:** Splitting reduces cognitive load, enables targeted testing, and speeds up IDE navigation. No functional change.

### 1.3 Duplicate/Redundant Code

| Issue | Files | Action |
|-------|-------|--------|
| Duplicate `AmputationLevel` type | `case.ts:956`, `infection.ts:234` | Rename one to `HandAmputationLevel` |
| Two patient identifier hash implementations | `patientIdentifierHash.ts` (SHA-256), `patientIdentifierHmac.ts` (HMAC) | Deprecate `patientIdentifierHash.ts`, move `normalizePatientIdentifier()` to shared location |
| Scattered type definitions in `lib/` | 50+ types in `statistics.ts`, `handTraumaMapping.ts`, `snomedCt.ts`, etc. | Consolidate into `types/statistics.ts`, `types/handTrauma.ts` |
| Test factory duplication | `makeCase()` in 5+ test files | Create shared `__tests__/helpers/factories.ts` |
| Mock duplication | AsyncStorage mock in 4 files, expo-crypto in 6 | Create `__tests__/helpers/mocks.ts` |

### 1.4 Dead Code (Safe to Remove)

| Item | Location | Notes |
|------|----------|-------|
| `MEDIA_CATEGORY_LABELS` | `client/types/case.ts:1868` | @deprecated, zero imports |
| `MEDIA_TYPE_TO_CATEGORY` | `client/lib/operativeMedia.ts:11` | @deprecated, zero imports |
| `CATEGORY_TO_MEDIA_TYPE` | `client/lib/operativeMedia.ts:24` | @deprecated, zero imports |
| `formOpenedAtRef` | `CaseFormScreen.tsx` | Created but never referenced |
| `attached_assets/` directory | Project root | Development artifacts, not shipped |

**Backward-compat items to keep:** `OperatingTeamRole`, `OperatingTeamMember`, `age` field, `operatingTeam` field, `MediaAttachment.category` — all needed for loading old case data.

---

## 2. Data Capture & Storage

### 2.1 Storage Layer Issues

| # | Severity | Issue | File | Impact |
|---|----------|-------|------|--------|
| 1 | **Critical** | Swallowed async error in patient hash migration — `.catch(() => {})` buries failures | `storage.ts:650` | HMAC migration can stall silently |
| 2 | **High** | Cache invalidation race between `saveCaseIndex()` (clears cache) and `getCaseSummaries()` rebuild | `storage.ts:731-750` | Concurrent reads can see stale data |
| 3 | **High** | Global migration flags (`migrationChecked`, `specialtyRepairChecked`) never reset across app versions | `storage.ts:454` | Future migrations will be skipped |
| 4 | **Medium** | Unbounded `caseSummaryCache` array — grows linearly with case count | `storage.ts:277` | Memory pressure at 10K+ cases |
| 5 | **Medium** | Date normalization happens on both read AND save (double normalization) | `migration.ts` + `storage.ts:695` | Inefficiency, test coverage gap |
| 6 | **Medium** | MMKV inbox state double-serializes (JSON string inside MMKV's own serialization) | `inboxStorage.ts:142` | Slower on 100+ inbox photos |
| 7 | **Low** | Legacy XOR decryption still in code as fallback | `encryption.ts:59-76` | Security smell, should log deprecation |

**Recommendations:**
- Add error logging to hash migration (replace `.catch(() => {})` with `.catch(e => console.error('Hash migration failed:', e))`)
- Tie migration flags to `schemaVersion` so version bumps trigger re-check
- Add `maxSize` parameter to summary cache, evict oldest entries
- Normalize dates in one location only (on read, not save)

### 2.2 Media Encryption

| # | Severity | Issue | Impact |
|---|----------|-------|--------|
| 1 | **Medium** | All encryption/decryption is in-memory — no streaming for large files | OOM risk on 50MB+ images on low-end devices |
| 2 | **Medium** | `decryptCache` relies on external callers for invalidation — no time-based auto-eviction | Stale decrypted files linger if cleanup hooks missed |
| 3 | **Low** | Empty catch blocks in media cache cleanup hide permission errors | Silent failures make debugging hard |

### 2.3 Inbox Transactional Model

The inbox uses a proper `unassigned → reserved → assigned` lifecycle with finalize-on-save and release-on-cancel. This is well-designed. One gap:

- **High**: CaseFormScreen doesn't release reserved inbox items on unmount. If the user navigates away without saving, photos remain reserved indefinitely until stale cleanup runs (26 hours).

---

## 3. Server & API

### 3.1 Security

| # | Severity | Issue | File | Recommendation |
|---|----------|-------|------|----------------|
| 1 | **High** | Rate limiter memory leak — cleanup only runs when map > 1000 entries | `routes.ts:200-213` | Add periodic `setInterval` cleanup every 5 min |
| 2 | **High** | Weak IP detection — `req.ip` may be undefined behind proxy, falls back to `"unknown"` | `routes.ts:295` | Verify `trust proxy` config, handle `"unknown"` explicitly |
| 3 | **Medium** | DB connection pool uses defaults (unbounded connections) | `db.ts:8` | Set `max: 20, idleTimeoutMillis: 30000` |
| 4 | **Medium** | SNOMED cache maps grow unbounded in memory | `snomedApi.ts` | Implement LRU eviction (max 1000 entries) |
| 5 | **Medium** | No email retry logic — single Resend API failure loses the email | `email.ts` | Add 3-attempt retry with exponential backoff |
| 6 | **Medium** | CORS origins hardcoded | `app.ts:15-47` | Move to env var `ALLOWED_ORIGINS` |
| 7 | **Low** | Magic numbers (rate limit = 10, window = 60s, JWT = 7d) | `routes.ts` | Extract to config constants |

### 3.2 Schema

- **Good:** UUID PKs, cascade deletes, JSONB for extensible fields, strategic indexes
- **Medium:** Missing unique constraint on `(teamId, userId)` in `team_members` — allows duplicate memberships
- **Medium:** `medicalCouncilNumber` stored in both column and JSONB `professionalRegistrations` — sync risk
- **Low:** `profilePictureUrl` stores relative paths — breaks if storage moves

---

## 4. Navigation & Screens

### 4.1 Critical Issues

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | **Camera encryption queue race condition** — rapid shutter taps can lose photos | `OpusCameraScreen.tsx:95-102` | Data loss |
| 2 | **LockScreen not wrapped in error boundary** — crash = app inaccessible | `RootStackNavigator.tsx:861` | Security-critical UI failure |
| 3 | **Missing error boundary for Stack.Navigator** — 26 screens with no intermediate boundary | `RootStackNavigator.tsx:561` | Unrecoverable crashes |

### 4.2 High-Priority Issues

| # | Issue | File |
|---|-------|------|
| 1 | Only 2 deep links implemented (`opus://inbox`, `opus://camera`). Missing `opus://case/:id`, `opus://episode/:id` | `RootStackNavigator.tsx` |
| 2 | CaseDetailScreen doesn't reload on focus — stale data after editing | `CaseDetailScreen.tsx` |
| 3 | InboxScreen case picker modal async search not cancellable | `InboxScreen.tsx` |
| 4 | Dashboard specialty filter doesn't persist across sessions | `DashboardScreen.tsx` |

### 4.3 Performance

- **Good:** React.memo on all dashboard list components, useMemo on computed data
- **Medium:** InboxScreen `groupByDate()` recalculates on every render (should use useMemo)
- **Low:** Grid dimension constants calculated inside component (should be module-level)

---

## 5. Test Coverage

### 5.1 Current State

**705 tests, 42 files, 1.42s runtime. All passing.**

Existing tests are high quality — behavior-focused, properly isolated, good edge cases, fast execution.

### 5.2 Critical Coverage Gaps

| File | Lines | Risk Level | What's Untested |
|------|-------|------------|-----------------|
| `useCaseForm.ts` | 1,948 | **Critical** | The central form reducer (15+ actions, edit-mode, validation, duplication) — **highest-risk untested code** |
| `storage.ts` | 1,160 | **Critical** | Core CRUD, case index, HMAC hashing, draft persistence. Only 4 cache tests exist. |
| `migration.ts` | 328 | **Critical** | `migrateCase()` runs on every load — regressions silently corrupt data |
| `encryption.ts` | 183 | **Critical** | XChaCha20-Poly1305 encrypt/decrypt for all case data |
| `exportCsv.ts` | 304 | **High** | 55-column CSV export. Only 3 indirect tests via implant export. |
| `exportFhir.ts` | 628 | **High** | FHIR R4 Bundle generation. 1 indirect test. |
| `mediaStorage.ts` | 428 | **High** | Encrypted media routing, URI canonicalization, v1/v2 routing |
| `server/routes.ts` | 1,399 | **High** | 41 endpoints. Only rejection tests exist — zero happy-path tests. |
| All 28 screens | — | **Medium** | Zero component/screen tests |
| All hooks | — | **Medium** | Zero hook tests |

### 5.3 Test Infrastructure Gaps

- No `vitest.setup.ts` for shared global setup
- No `__mocks__/` directory — same mocks copy-pasted across 4-6 files
- No coverage configuration or thresholds
- No shared test factory file
- No component test library (`@testing-library/react-native` not installed)

---

## 6. CLAUDE.md Accuracy Issues

### 6.1 Factually Wrong

| Claim | Actual | Section |
|-------|--------|---------|
| `buildNumber 4` | **5** | iOS / App Store |
| "43 columns" CSV export | **55 columns** | Data export |
| "245 structured diagnoses" | **~286** | Diagnosis-to-procedure |
| "490 procedures" | **509** | Procedure picklists |
| `inboxStorage (29 tests)` | **13 tests** | Testing |
| "28 test files" in `__tests__/` | **38 test files** | Project structure |
| `server/routes.ts (2170 lines)` | **1399 lines** | Project structure |
| `server/storage.ts (706 lines)` | **347 lines** | Project structure |
| `shared/schema.ts (654 lines)` | **337 lines** | Project structure |
| `schema.ts` "14 tables" | **8 tables** | Project structure comment |
| "3 SQL migration files" | **4 files** | Project structure |
| "45+ API endpoints" | **~41** | API endpoints |

### 6.2 Stale Counts (Internal Inconsistencies)

- `skinCancerConfig`: "87 tests" in one section vs "89 tests" in another (89 is correct)
- `jointImplant`: "39 tests" vs "44 tests" (44 is correct)
- `handElective`: "50 tests" vs "52 tests" (52 is correct)
- `storageCache`: "2 tests" (actually 4)
- `patientIdentity`: "13 tests" vs "11 tests" (11 is correct)
- Total skin-cancer suite: "116 tests" (actually 125)

### 6.3 Structural Issues

- **Duplicate "Client tests" bullet** — two nearly-identical bullets with subtle differences
- **Missing files from project structure**: `server/app.ts` (the actual Express entry), `client/lib/caseSpecialty.ts`, `client/lib/dateFieldNormalization.ts`, `client/lib/exportPdfHtml.ts`, `client/lib/jointImplant.ts`, `client/lib/mediaAttachmentDefaults.ts`, `client/lib/mediaContext.ts`, `client/lib/operativeMediaForm.ts`, `client/types/caseSummary.ts`
- **`server/index.ts` description wrong** — says "Express entry: security headers, CORS, body parsing (335 lines)" but it's now just a 12-line entrypoint that imports `app.ts`

---

## 7. Prioritised Action Plan

### Phase 1: Pre-TestFlight (Do Now)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Fix CLAUDE.md accuracy (all factual errors, remove duplicate bullets, update counts) | Documentation trust | 1 hour |
| 2 | Add error logging to patient hash migration (replace `.catch(() => {})`) | Silent failure visibility | 5 min |
| 3 | Remove dead deprecated exports (`MEDIA_CATEGORY_LABELS`, `MEDIA_TYPE_TO_CATEGORY`, `CATEGORY_TO_MEDIA_TYPE`) | Code cleanliness | 15 min |
| 4 | Clean lint warnings if any | Build quality | 15 min |

### Phase 2: v2.1 Priority Fixes

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Add error boundary around LockScreen and Stack.Navigator | Crash resilience | 2 hours |
| 2 | Fix OpusCameraScreen encryption queue mutex | Photo loss prevention | 2 hours |
| 3 | Add DB connection pool config | Production stability | 30 min |
| 4 | Add LRU eviction to SNOMED cache | Memory management | 1 hour |
| 5 | Fix rate limiter periodic cleanup | Security | 1 hour |
| 6 | Add CaseFormScreen inbox cleanup on unmount | Data integrity | 1 hour |
| 7 | Tie migration flags to schemaVersion | Future-proofing | 1 hour |

### Phase 3: v2.2 Test & Architecture

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | Test `useCaseForm.ts` reducer (pure function, easy to test) | Critical coverage | 4 hours |
| 2 | Test `migration.ts` | Data integrity | 2 hours |
| 3 | Test `encryption.ts` | Security assurance | 2 hours |
| 4 | Test `storage.ts` CRUD | Core reliability | 4 hours |
| 5 | Test `exportCsv.ts` and `exportFhir.ts` | Export correctness | 3 hours |
| 6 | Centralize test mocks and factories | DX improvement | 2 hours |
| 7 | Split `storage.ts` into focused modules | Maintainability | 4 hours |
| 8 | Add coverage configuration and CI gates | Quality assurance | 1 hour |
| 9 | Add deep links for case and episode screens | User experience | 3 hours |

---

## 8. What Each Change Improves

### Error logging on hash migration
**Before:** Migration failure silently swallowed. Developer has no idea HMAC migration stalled.
**After:** Console error logged with case ID. Can monitor in Sentry/logs. Enables retry logic.

### Error boundaries
**Before:** A crash in LockScreen = app inaccessible. Crash in any screen = white screen.
**After:** Graceful fallback UI with "Something went wrong" and retry. Security-critical LockScreen has independent boundary.

### Camera encryption mutex
**Before:** Rapid shutter taps can interleave `processQueue()` calls, potentially losing photos.
**After:** Mutex ensures single-threaded queue processing. Fire-and-forget remains responsive but never loses items.

### DB pool configuration
**Before:** Unbounded connections under load. Railway memory exhaustion possible.
**After:** Max 20 connections with 30s idle timeout. Predictable resource usage.

### LRU cache for SNOMED
**Before:** Unlimited cache growth. 10,000 unique searches = unbounded memory.
**After:** 1,000-entry cap with LRU eviction. Bounded memory, still fast for repeated queries.

### Storage module splitting
**Before:** 1,160-line `storage.ts` mixing CRUD, migrations, caching, hashing, drafts. Hard to test, hard to reason about.
**After:** `caseStorage.ts` (CRUD), `caseIndex.ts` (indexing/search), `draftStorage.ts` (auto-save). Each focused, testable, ~300 lines.

### Test coverage for form reducer
**Before:** 1,948-line reducer with 15+ actions completely untested. Any regression discovered manually.
**After:** Pure-function reducer tested with all actions, edge cases (edit mode, specialty preservation, duplication, validation). Catches regressions automatically.

### CLAUDE.md corrections
**Before:** 25+ factual errors create confusion for future developers/AI. Wrong counts, stale line numbers, missing files.
**After:** Accurate documentation builds trust and enables correct planning. Single source of truth.
