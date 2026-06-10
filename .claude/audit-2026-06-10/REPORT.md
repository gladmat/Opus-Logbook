# Opus security, privacy & code quality audit — 2026-06-10

_Three parallel deep read-only sweeps (server security/authZ, client crypto/PHI privacy, code quality + post-smoke delta) plus orchestrator adversarial verification of the highest-stakes claims. Complements the 2026-06-04 depth=quick smoke audit, which did not cover deep security, privacy flows, or post-smoke commits._

## Gate baseline

| Gate | Result |
| --- | --- |
| `tsc --noEmit` | ✅ clean |
| `vitest` | ✅ 1799/1799 across 100 files |
| `eslint` | ⚠️ 2 known warnings (server/push.ts, server/rateLimit.ts import shape) |
| Coverage (lines) | 51.84% (threshold 48%) |
| `npm audit --omit=dev` | 1 critical · 3 high · 21 moderate (see N4/F003/F008) |

## TL;DR

- **Posture: strong. Zero critical findings.** Every Phase 6 security fix verified intact by direct code reading: assessment authZ (`assertIsPartyOnSharedCase` on submit + read, history route ordered before `/:sharedCaseId`), avatar JWT gate + random filenames + path-traversal guard, `normalizeEmail` at all 7 entry points + CHECK-constraint migration, Apple identityToken JWKS/issuer/audience verification (+ `sub` re-check on account delete), SNOMED conceptId regex, JWT_SECRET production blocklist, composite (id, userId) ownership on all sampled mutations, secureStorage wrapper exclusivity (zero direct expo-secure-store imports), scrypt PIN + lockout, TOFU pinning fail-closed, key zeroisation, share-blob third-party contact-detail exclusion, app-switcher overlay, Sentry/PostHog PHI scrubbing, ESLint guards (date parsing, secure-store imports). No secrets in tracked files; `TESTING.local.md` + `.env` gitignored. Zero TODO/FIXME repo-wide.
- **F001 drizzle-orm exploitability re-verified LOW**: full `server/storage.ts` review — zero `sql.raw` / `sql.identifier` / dynamic `orderBy` / dynamic table selection across 185+ queries. Advisory remains real; upgrade is scheduled hygiene (Phase 2), not an emergency.
- **All 9 smoke-audit findings (2026-06-04) confirmed still OPEN** — no remediation had been run.
- **Net-new: 4** — N1 🟡 gallery-share decrypt-cache use-after-evict (pin API exists, unused in `handleShare`); N2 🔵 ungated `console.*` in client/lib (Phase 6 policy drift, no PHI); N3 🔵 push-token endpoints unlimited (info); N4 🔵 shell-quote critical advisory (dev-tooling only, non-breaking fix).
- **Post-smoke delta commits reviewed clean**: `08f5f6f` (date pickers — timezone-safe, 27 new tests), `8ecb1d0`/`1137d59` (gallery — correct memoisation + a11y), `d334e5c` (procedureRef pattern — correct).

## Triaged findings

| # | sev | file:line | what's wrong | fix | tier | tracked? |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | 🟡 medium | `MediaGalleryViewer.tsx:141` | share path holds decrypted temp URI across `await shareAsync` without pin → evictable mid-share (FlatList unmount swipe / background sweep) | pin before share, unpin in `finally` | logic | new |
| F001 | 🟡 medium | `package.json` | drizzle-orm 0.39.3 HIGH advisory (exploitability LOW, verified) | tested major bump → 0.45.x | logic | carried |
| F003 | 🟡 medium | `package.json` | ws/qs/ip-address moderate runtime advisories, non-breaking fixes | `npm audit fix` | mechanical | carried |
| N4 | 🔵 low | `package.json` | shell-quote critical via react-devtools-core (dev tooling) | same `npm audit fix` wave | mechanical | new |
| F002 | 🔵 low | `episodeStorage.ts` | no test file (mutex / transitions / linger filter) | add `episodeStorage.test.ts` | mechanical | carried |
| F004/F005 | 🔵 low | `episodeStorage.ts:189/217` | unused exports `deleteEpisode` / `getActiveEpisodes` | delete | mechanical | carried |
| F006(+7/9) | 🔵 low | `episodeStorage.ts:150` | dead no-op `queueMicrotask` block | delete | mechanical | carried |
| N2 | 🔵 low | `client/lib/storage.ts` +others | ungated `console.error/warn` vs Phase 6 invariant | `__DEV__` guard sweep | mechanical | new |
| N3 | 🔵 low | `server/routes.ts` | push-token endpoints not rate-limited | per-user limiter | mechanical | new |
| F008 | 🔵 low | `package.json` | @xmldom HIGH chain — build tooling only | track-only | mechanical | carried |

## Verified-clean (no action)

- **Server**: authN (jose JWT + tokenVersion on every request, single-use hashed reset tokens, no user enumeration), authZ/IDOR (composite checks on facilities, shared cases, blob update, team contacts, link), input validation (Zod everywhere sampled, Multer type+size limits), injection (no raw SQL, email templates escape names, SNOMED URL regex-gated), headers (helmet, HSTS 1y, frameguard deny, Permissions-Policy), rate limiting (auth/search/discovery/invitations), Sentry `beforeSend` scrubbing, generic 5xx.
- **Client**: XChaCha20-AEAD-only `decryptData`, nonce via `getRandomBytesAsync`, key zeroisation, no `Math.random` in crypto paths, no direct secure-store imports, JWT single-flight refresh, TOFU pin store fail-closed + cleared on logout/delete, share blob excludes third-party email/phone, app-state overlay, analytics/Sentry PHI-clean, formScrollRegistry/AcceptedMappingCard/caseMedia helpers carry no sensitive data.

## Known deferred (tracked elsewhere, not re-planned)

PSI discovery · per-file iCloud backup exclusion · commit-reveal blinded assessments · TOFU safety-number UI.

## Coverage & gaps

- NOT audited this round: simulator/visual QA (standing gap since smoke audit — recommend scoped `quality-audit.js` run with `includeSim: true` when a sim is up); push payload runtime inspection; deep-link param sanitisation trace; exhaustive per-diagnosis module sweep; rate-limiter proxy-bypass stress.
- Untested high-value modules beyond F002: `mediaDecryptCache.ts`, `mediaFileStorage.ts`, `snomedCt.ts` (Phase 3 queue).
- Refactor candidates (size only, no defects found): `procedurePicklist.ts` (9180 lines), `handSurgeryDiagnoses.ts` (3370), `headNeckDiagnoses.ts` (3084).

## Remediation

Executed on branch `quality/remediation-2026-06-10` per the approved plan (`~/.claude/plans/using-the-new-frontier-shimmying-sketch.md`). Every wave gated on `tsc` + full vitest + lint before commit; all gates stayed green throughout. Not pushed; no deploy.

### Remediation log (2026-06-10, same session)

| Wave | Finding(s) | Commit | Outcome |
| --- | --- | --- | --- |
| 0 | — | `ce549bc` | Audit artifacts persisted |
| 1 | N1 | `ba9eb3f` | `handleShare` pins the decrypted file for the share duration, unpin in `finally` |
| 2 | F003, N4 | `9bc4063` | `npm audit fix` (non-force): runtime surface now **0 critical / 3 high / 15 moderate** — remaining highs are the tracked @xmldom chain (F008) |
| 3 | F002 | `03fa406` | `episodeStorage.test.ts` — 12 tests (mutex serialisation, transition guard, 7-day linger) |
| 4 | F004/F005/F006/F007/F009 | `86afecc` | `deleteEpisode`, `getActiveEpisodes`, dead `queueMicrotask` block deleted (importers re-verified zero) |
| 5 | N2 | `259a7a7` | 47 `console.*` sites across 13 client/lib files `__DEV__`-gated (vitest defines `__DEV__=true`, test behaviour unchanged) |
| 6 | N3 | `167c753` | `pushTokenRateLimiter` (30/min/user) on POST + DELETE `/api/push-tokens` |
| 7 | F001 | `a956f3d` | **drizzle-orm 0.39.3 → 0.45.2.** Verified: tsc clean; 1811/1811 tests; `drizzle-kit push` to scratch Postgres created all 12 tables; local server smoke on scratch DB (health read, signup write, login + authed profile read) green; scratch DB dropped. **Railway deploy not performed — separate decision.** |
| 8 | Phase 3 | `3b44f82` | +4 decrypt-cache pinning tests (invalidate/clearAll drop pins, unbalanced unpin, stale-file self-heal); coverage thresholds ratcheted 48/52/42/48 → 52/55/47/52 |

### Final gate snapshot

| Gate | Before | After |
| --- | --- | --- |
| `tsc --noEmit` | clean | clean |
| vitest | 1799/1799 (100 files) | **1811/1811 (101 files)** |
| eslint | 2 known warnings | 2 known warnings |
| Coverage (lines) | 51.84% | **52.95%** (threshold ratcheted 48 → 52) |
| `npm audit --omit=dev` | 1 critical / 3 high / 21 moderate | **0 critical / 3 high / 15 moderate** (highs = tracked @xmldom chain) |

### Deviations from plan

- `mediaFileStorage.ts` already had an adequate test file (save/load round-trip, thumb fallback, delete) — the audit agent's "untested" claim was wrong; no padding tests added.
- The drizzle-orm HIGH advisory no longer appeared in `npm audit` output at remediation time (advisory DB churn); the upgrade was applied anyway per plan, eliminating the question permanently.

### Still open after remediation

F008 (@xmldom chain — track-only, upstream-owned) · deferred security items (PSI discovery, iCloud per-file backup exclusion, commit-reveal assessments, TOFU safety-number UI) · sim/visual QA sweep (run `quality-audit.js` with `includeSim: true`, scoped, when a sim with the dev build is up) · manual sim spot-check of gallery share (N1) queued for next sim session · Railway deploy of the server-side changes (drizzle bump + push-token limiter) awaiting an explicit go.
