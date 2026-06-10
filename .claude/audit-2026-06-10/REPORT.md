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

Executed on branch `quality/remediation-2026-06-10` per the approved plan (`~/.claude/plans/using-the-new-frontier-shimmying-sketch.md`): Phase 1 mechanical (N1, F003+N4, F002, F004–F009, N2, N3), Phase 2 human-gated drizzle upgrade (F001), Phase 3 media tests + coverage ratchet. A remediation log is appended below as waves complete.
