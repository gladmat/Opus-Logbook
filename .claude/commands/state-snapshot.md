---
description: Regenerate docs/STATE.md from live repo sources (never hardcode)
---

# /state-snapshot

Regenerate `docs/STATE.md` by **re-reading live sources every run**. Never copy
values from a previous STATE.md or from memory — read the file, run the command,
and if a source cannot be read, write `[VERIFY: could not read <path>]` rather
than guessing.

## Procedure

### Step 1 — Preserve the manually-maintained section

`docs/STATE.md` has a fenced block delimited by these exact marker lines:

```
<!-- BEGIN MANUAL SECTION — do not overwrite; edit by hand -->
...
<!-- END MANUAL SECTION -->
```

**Read the existing `docs/STATE.md` first.** Extract everything between those two
markers **verbatim** and re-emit it byte-for-byte in the new file. Never replace
it with empty content. If `docs/STATE.md` does not exist yet, emit the seed
manual section from the bottom of this file.

### Step 2 — Regenerate the generated sections from code

Run these and build the report from the output. Do not transcribe values you did
not just read.

**App identity** — from `app.json` (there is no `app.config.*`):
```bash
node -e "const a=require('./app.json').expo; console.log(JSON.stringify({name:a.name,slug:a.slug,version:a.version,iosBundle:a.ios.bundleIdentifier,iosBuild:a.ios.buildNumber,androidPkg:a.android.package,androidVersionCode:a.android.versionCode,appleTeamId:a.ios.appleTeamId,easProjectId:a.extra.eas.projectId,owner:a.owner},null,2))"
```
Note in the output that `eas.json` sets `appVersionSource: "remote"`, so
`buildNumber`/`versionCode` in app.json are documentation-only (EAS overwrites at
build time).

**EAS build profiles** — read `eas.json`, list each profile under `build.*` and
the `submit.production.ios.ascAppId`.

**Repo remote**:
```bash
git remote -v | awk '/fetch/{print $2}'
```

**Dependency versions** — from `package.json`:
```bash
node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};for(const k of ['expo','react-native','react','drizzle-orm','drizzle-kit','typescript','vitest'])console.log(k, d[k]||'(missing)')"
```

**Category list + count** — from `client/constants/categories.ts`:
```bash
node -e "const s=require('fs').readFileSync('client/constants/categories.ts','utf8');const ids=[...s.matchAll(/id:\s*\"([a-z_]+)\"/g)].map(m=>m[1]);console.log('count:',ids.length);console.log(ids.join(', '));const claim=(s.match(/(\d+)\s+procedure categories/)||[])[1];if(claim&&Number(claim)!==ids.length)console.log('DEFECT: comment claims '+claim+' but array has '+ids.length);"
```
Report the count and, if the file comment's claimed count differs from the actual
array length, flag it as a DEFECT (do not fix the file — this command is read-only
w.r.t. source).

**Specialty assessment modules** — enumerate the `*Assessment.tsx` components:
```bash
find client/components -name '*Assessment.tsx' | sort
```

**Phase status** — copy the current top-of-list phase bullets from `CLAUDE.md`
(the "v2.0 overhaul status" section). Summarise the head (latest shipped version
+ date) plus the COMPLETE milestone list; do not paraphrase away the version
numbers.

**Duplicate SNOMED report** — scan real `snomedCtCode:` fields, exclude tests,
show cross-file collisions (the actionable class) and the known `35646002`:
```bash
grep -rhoE 'snomedCtCode:\s*"[0-9]{5,18}"' client/lib/ client/constants/ | grep -oE '[0-9]{5,18}' | sort | uniq -d | while read c; do files=$(grep -rlE "snomedCtCode:\s*\"$c\"" client/lib/ client/constants/ | grep -v __tests__ | tr '\n' ',' ); nfiles=$(echo "$files" | tr ',' '\n' | grep -c .); if [ "$nfiles" -ge 2 ]; then echo "$c  -> $files"; fi; done
```
In STATE.md, present: (a) the count of codes reused across ≥2 non-test files,
(b) confirm/deny the `35646002` collision, (c) a note that same-file generic-code
reuse (e.g. `122465003` Reconstruction procedure) dominates the raw scan and is
mostly legitimate.

**`// VERIFY` count per file**:
```bash
grep -rl "// VERIFY" client/ | while read f; do echo "$(grep -c '// VERIFY' "$f")  $f"; done | sort -rn; echo "total: $(grep -rc '// VERIFY' client/ | awk -F: '{s+=$2}END{print s}')"
```

**Schema** — table count + latest migration (there is no explicit schema-version
constant; the latest dated migration is the version signal):
```bash
echo "tables: $(grep -cE 'pgTable\(' shared/schema.ts)"; ls migrations/*.sql | sort | tail -1
```

### Step 3 — Assemble docs/STATE.md

Write the file with:
- **Header**: `# Opus — State Snapshot` + a line `Generated <YYYY-MM-DD> · regenerate with /state-snapshot` (use today's date).
- All generated sections above, each clearly headed.
- The preserved manual section (Step 1) between its BEGIN/END markers.
- **Footer** (exact): `> ⚠️ Upload docs/STATE.md to the Claude.ai project knowledge, replacing the old copy.`

### Step 4 — Report to the user

List every `[VERIFY]` in the manual section you were able to resolve from code
(e.g. "App Store Connect ID: eas.json confirms 6759992788"), and every one that
remains manual-only. End with the project-knowledge upload reminder.

## Anti-patterns — do NOT

- Do **not** hardcode any value — read the file / run the command each run.
- Do **not** emit `.env` contents, secrets, `JWT_SECRET`, `DATABASE_URL`, API
  keys, or Resend keys in any generated section. (Test-account passwords live in
  the hand-maintained manual section only, by the maintainer's choice — never add
  new secrets to generated sections.)
- Do **not** overwrite or blank the manual section — always carry it forward
  verbatim.
- Do **not** resolve a fact by assumption. Read it or mark `[VERIFY: could not
  read <path>]`.

---

## Seed manual section (used only if docs/STATE.md does not yet exist)

<!-- BEGIN MANUAL SECTION — do not overwrite; edit by hand -->
### Manually-maintained facts

Values marked `[VERIFY]` were not corroborated from the repo at seed time; confirm
against the live external system before relying on them.

**Infrastructure**
- Production API: `logbook-api.drgladysz.com` (Railway, project name `[VERIFY]`)
- Local API: `localhost:5001`
- App Store Connect ID: `6759992788`
- DNS: `drgladysz.com` at panel.zenbox.pl; `opuslogbook.com` on Cloudflare Registrar
- Landing page: live; waitlist → Railway API → PostgreSQL

**Apple Developer**
- Account: `mateusz.gladysz@icloud.com` `[VERIFY]`
- Team ID: `8CQ38RR2W4`
- Distribution cert + provisioning profile expire **Feb 2027** `[VERIFY]`

**Email**
- Resend (key stored on Railway as `RESEND_API_KEY` — value never recorded here)
- From: `noreply@drgladysz.com`

**Ontoserver (SNOMED CT verification)**
- `r4.ontoserver.csiro.au/fhir`, edition CT-AU, version `20260228` `[VERIFY current]`

**Test accounts** (ephemeral staging/prod accounts — rotate regularly)
- Credentials live in gitignored `TESTING.local.md`. **Never embed test passwords
  in this tracked file** — reference `TESTING.local.md` only (repo 2.6.0 convention).

**Active threads / open items**
- `categories.ts` comment says "12 categories" but array has 11 (Body Contouring
  merged into Aesthetics) — comment stale, code intentional.
- On-device validation round owed for the 2.13.0 team-sharing linking flows.
<!-- END MANUAL SECTION -->
