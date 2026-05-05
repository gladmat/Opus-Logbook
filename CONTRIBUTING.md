# Contributing to Opus

Opus is a privacy-first surgical case logbook (Expo / React Native + Express
backend). This file is the "where do I start" doc; the architectural source of
truth is [CLAUDE.md](./CLAUDE.md).

## Setup

1. Install Node 20 (the repo pins via `.node-version`). Use `nvm use` if
   you have nvm.
2. Install PostgreSQL 16 (Homebrew: `brew install postgresql@16`) and start it.
3. Copy env: `cp .env.example .env`, then fill in `DATABASE_URL`,
   `JWT_SECRET` (`openssl rand -hex 48`), and set `PORT=5001`.
4. Install deps: `npm ci --include=dev`. **Never use `--legacy-peer-deps`**
   — EAS rejects it and you'll only find out at build time. If you hit a
   peer-dep conflict, use `npx expo install <pkg>` or pin versions explicitly.
5. Apply schema: `npm run db:push` (dev only — see "Database" below).
6. Run the app: `npm run dev:mobile` (Expo on LAN + Express server).

Test credentials live in `TESTING.local.md` (gitignored). Ask Mateusz for
them via a secure channel — they're not in the repo.

## Scripts

```bash
npm run dev:mobile     # Watch-mode API + Expo Go on LAN for device testing
npm run server:dev     # Express API only (port 5001)
npm run expo:dev       # Expo only (LAN host, port 8083)
npm run db:push        # Push Drizzle schema to PostgreSQL (DEV ONLY)
npm run server:build   # Production server build → server_dist/
npm run server:prod    # Run production server
npm run lint           # ESLint (CI-gated)
npm run check:types    # tsc --noEmit (CI-gated)
npm run check:format   # Prettier --check (CI-gated)
npm run format         # Prettier --write
npm run test           # Vitest run (CI-gated, must stay green)
npm run test:watch     # Vitest watch mode
```

## Quality gates (enforced by CI)

Every PR runs `.github/workflows/verify.yml` with six parallel jobs:

- TypeScript (`tsc --noEmit`)
- ESLint (`npm run lint`)
- Prettier (`npm run check:format`)
- Vitest (`npm run test`)
- Server esbuild build (`npm run server:build`)
- Strict `npm ci --include=dev` install (no `--legacy-peer-deps`)

Tests **must** stay green. Coverage thresholds will be added in a follow-up.

## Commit messages

- One focused change per commit. Bug fix, feature, refactor — don't mix.
- Imperative mood, summary on first line, blank line, then `why`-focused
  body. Avoid restating the diff.
- Reference the relevant audit / plan section when the change closes a
  known item.
- Co-author trailer: `Co-Authored-By: …` is fine and preferred when AI
  tooling helped.

## Branch / PR

- Feature branches off `main`. Squash-merge or rebase, never merge commits.
- Open a PR even for solo work — CI is the safety net, branch protection
  requires green CI to merge.
- PR description explains the **why**; the diff explains the what.

## Security

This is a clinical app handling patient data. A few non-negotiables:

- **Never** commit `.env`, `TESTING.local.md`, real patient data, or
  Sentry DSNs. `.gitignore` is conservative; if you add a secret-shaped
  file, double-check.
- **Never** log raw patient identifiers, names, or DOBs server-side.
  Pino's `beforeSend` in `server/sentry.ts` strips PII; don't log
  payload bodies in plain `log.info`.
- **All** SecureStore writes on device must go through
  `client/lib/secureStorage.ts` (applies `WHEN_UNLOCKED_THIS_DEVICE_ONLY`).
- **Date-only** values (`procedureDate`, `injuryDate`, etc.) parse with
  `parseIsoDateValue` / `parseDateOnlyValue` from `client/lib/dateValues`.
  ESLint's `no-restricted-syntax` rule blocks `new Date("YYYY-MM-DD")`.
- Run a typecheck and the relevant test suite before pushing — CI will
  catch you, but it's faster locally.

## Database

`npm run db:push` is **for development only**. It uses `drizzle-kit push`
which is non-versioned and unreversible. Production schema changes go
through:

1. Edit `shared/schema.ts`
2. Generate a migration: `npx drizzle-kit generate`
3. Commit the SQL file under `migrations/`
4. Apply via the deploy job (or `npx drizzle-kit migrate` locally against
   a non-prod DB to test)

This is currently transitioning per the audit plan (Week 2, item 8). See
`migrations/` for existing files.

## Architecture

For everything else — module structure, specialty modules, design system,
state management, encryption pipeline — read [CLAUDE.md](./CLAUDE.md).
That doc is the load-bearing reference and is kept up to date with each
substantial change.

## Issues / feedback

Open a GitHub issue with: what you tried, what you expected, what
happened. Include `git rev-parse --short HEAD` output. For security
reports, email Mateusz directly rather than filing a public issue.
