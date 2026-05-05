# Database migrations

This directory holds SQL migrations for the Postgres schema. There are two
kinds of file in here today:

1. **Hand-written, date-prefixed SQL** (`20260306_*.sql`,
   `20260425_*.sql`, etc.) — these were authored by hand during early
   schema iteration and applied manually with `drizzle-kit push`. They are
   already applied to production. Don't run them again — `drizzle-kit
   migrate` would fail on existing tables.

2. **Drizzle-generated, numbered SQL** (`0000_*.sql`, `0001_*.sql`, …) —
   the canonical pattern. Created by `npm run db:generate` from the diff
   between `shared/schema.ts` and the `migrations/meta/_journal.json`
   ledger. Applied in order by `npm run db:migrate`.

## Going forward

For all new schema changes:

1. Edit `shared/schema.ts`.
2. `npm run db:generate` — creates a new numbered SQL file under
   `migrations/` and updates `meta/_journal.json`.
3. Review the generated SQL. If it does anything destructive, double-check
   it before committing.
4. Commit the SQL + the journal update.
5. The deploy job runs `npm run db:migrate` against production to apply.

## Local dev iteration

For fast prototyping of schema changes against a local dev DB only:

```bash
npm run db:push
```

`db:push` is **not safe for production** — it does not produce versioned
migrations and cannot be reversed. Use it on disposable local databases
only.

## Cutover

To start using `drizzle-kit migrate` going forward, the team will need to
generate a baseline migration that captures the current schema and
seed `meta/_journal.json` so drizzle-kit doesn't try to re-apply the
existing hand-written files. That cutover is a separate change, planned
but not yet executed. Until then, the path is:

- New schema change → `db:generate` → manually apply (or `db:push` to a
  staging DB to verify) → coordinate with the prod cutover.

See [CONTRIBUTING.md](../CONTRIBUTING.md#database) for the developer flow.
