# Next-session prompt — Opus audit, session 9

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. Sessions 1–8 cleared
> the bulk of source-level audit findings. **Session 9's main
> remaining work is either (a) the I/O test surface (auth /
> sharingApi / teamContactsApi / assessmentApi / discoveryService —
> needs fetch-mock infrastructure, dedicated session) OR (b) the
> interactive sim verification clusters that depend on tap tooling
> being available.** Pick based on what's loaded at session start.

---

You are continuing a multi-session visual + functional audit of **Opus**,
a full-stack Expo/React Native surgical logbook. Sessions 1–8 (2026-05-14/16)
have cleared the bulk of source-level audit findings:

- **Sessions 1–3:** 40-screen visual sweep, 11 specialty modules,
  populated-data surfaces, light-theme sweep, iPhone SE 3.
- **Session 4:** Dead routes deleted, testID + a11y backlog, raw-hex
  round 1, case-form Pressable a11y, HeadNeck React.memo.
- **Session 5:** Server BCRL/post-melanoma TNM-vs-ISL staging fix,
  vestigial PlanCase cleanup, React.memo perf audit (DiagnosisPicker /
  HandElectivePicker / ProcedureSubcategoryPicker), all 19
  react-hooks/exhaustive-deps closed, 18 import-duplicates, 29
  array-types, 82 unused-vars, raw-hex round 2.
- **Session 6:** Onboarding token activation + raw-hex round 3 (132 → 10),
  half-shipped multi-digit trigger digit feature wired up,
  ProcedureClinicalDetails React.memo + stable props, BreastProgressive
  picker handler stabilised, 4 test coverage gaps closed (+69 tests).
- **Session 7:** ProcedureEntryCard ref-based perf refactor (stable
  handlePicklistSelect + removeProcedure/moveProcedureUp/moveProcedureDown
  via proceduresRef pattern); 3 more 0-coverage lib files closed
  (melanomaStaging / episodeHelpers / handElectiveFlow, +54 tests);
  CLAUDE.md App Screen Map table self-contained.
- **Session 8:** **Melanoma N3c clinical fix** (calculateNStage promotes
  ≥1 node + in-transit to N3c; calculateOverallStage handles
  N3a/N3b/N3c via startsWith — behavioural change for ~1% of melanoma
  cases, **worth your clinical review**); 3 more 0-coverage lib files
  closed (moduleSummary +41 / procedureConfig +37 / buildShareableBlob
  +17 = +95 tests); OnboardingScreen.tsx deleted (-1132 lines);
  CLAUDE.md drift round 2 (test count / testID count / component
  counts / lib lines all synced); 8 more ProcedureEntryCard callbacks
  stabilised via procedureRef pattern.

**Current state:**
- **Tests:** 1766/1766 across 97 files.
- **Lint warnings:** 2 (both upstream `import/no-named-as-default` from
  `expo-server-sdk` and `express-rate-limit` — can't fix without forking).
- **`tsc --noEmit`:** clean.
- **Raw-hex in client/ outside palette / test files:** 2 (only
  legitimate `#555` + `#999` in MediaGalleryViewer per CLAUDE.md
  skip rule).

## ⚠️ FIRST — clinical review of session 8 commit `8588b9c`

**`8588b9c` "Fix melanoma N3c short-circuit per AJCC 8th Ed"** is a
behavioural change affecting displayed Stage for melanoma cases
entered with both `lnStatus === "positive"` AND
`satelliteInTransit === true`. Per AJCC 8th Ed, these should be N3c
(promoted to Stage IIIC or IIID depending on T). Prior behaviour
under-staged them as N1a/N1b/N2a/N2b (Stage IIIA/IIIB).

**Before pushing the session-8 batch to TestFlight,** Mateusz should
read the commit and either confirm the fix is clinically correct or
flag a different interpretation. Logic is in
`client/lib/melanomaStaging.ts:160-203` and `:318-333`; tests are in
`client/lib/__tests__/melanomaStaging.test.ts`. See
`REPORT-session8.md` "Cluster 2 + 7 details" for the before/after
behavioural table.

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session8.md` — most recent. Its
   "Findings — triaged" + "Coverage & gaps" sections list what's left.
2. `.claude/audit-2026-05-14/REPORT-session7.md`
3. `.claude/audit-2026-05-14/REPORT-session6.md`
4. `.claude/audit-2026-05-14/REPORT-session5.md`
5. `.claude/audit-2026-05-14/REPORT-session4.md`
6. `.claude/audit-2026-05-14/REPORT-session3.md` — has the "Tooling
   notes" with Maestro 2.5.1 kAXError workarounds + session 7's
   Maestro `launchApp` state-reset discovery.
7. `CLAUDE.md` → "AI Testing & Visual Quality Standards" + "Design
   Quality & Aesthetics".
8. Auto-loaded memory: `project_mac_dev_env.md`,
   `project_opus_visual_audit.md`, `feedback_testing_delegation.md`.

## ENVIRONMENT BRING-UP — verify but don't depend on it

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH=$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
```

**Source-level clusters don't need the sim or API server.** They run on:
- `npm run check:types` (must stay clean)
- `npx vitest run` (must stay green; can add tests)
- `npm run lint` (warning count must not increase above 2)

For optional sim-dependent clusters: iPhone 17 sim UDID
`6AF34D12-7A59-439E-A861-768C5578B00A`, iOS 26.4. Session 7
confirmed clean boot from shutdown. **Before attempting any
sim-dependent cluster**, verify either:
- `computer-use` MCP is available (check deferred tools list for
  `mcp__computer-use__*`)
- OR Maestro pattern that preserves state across `launchApp` is
  established

If none, **skip sim-dependent clusters** and spend the time on
source-level work.

## THE TASK — priority order

Write findings to a new `.claude/audit-2026-05-14/REPORT-session9.md`.
**Work the list top-down**; each cluster is independently committable.

---

### 1. **I/O surface test coverage** (~3-4 hours, source-level, the
biggest remaining priority)

Session 6's gap list contained 12 0-coverage lib files. Sessions 6-8
closed 7 of them. The remaining 5 are ALL I/O-bearing:

| File | Lines | What it does |
|------|-------|--------------|
| `client/lib/auth.ts` | ~600 | JWT lifecycle, login/signup/Apple/refresh, sessionExpired event bus, authFetch with 401 retry |
| `client/lib/sharingApi.ts` | ~? | E2EE case sharing CRUD (POST/GET inbox/outbox/verify/revoke/update) |
| `client/lib/teamContactsApi.ts` | ~? | Team contact CRUD + link/unlink + invitations + user device keys |
| `client/lib/assessmentApi.ts` | ~? | Blinded assessment submit/status/history |
| `client/lib/discoveryService.ts` | ~? | Background contact discovery (24h throttle, user-scoped AsyncStorage) |

**Infrastructure needed:** these all wrap `fetch` calls. Recommended
setup is `undici-mock-agent` (the Node-native fetch mock that
vitest's vite-node already runs on). Add a `client/lib/__tests__/
__fixtures__/apiMock.ts` helper. Pattern:

```ts
import { MockAgent, setGlobalDispatcher } from "undici";

const agent = new MockAgent();
setGlobalDispatcher(agent);
const api = agent.get("https://api-server-production-4dd7.up.railway.app");
api.intercept({ path: "/api/auth/login", method: "POST" })
   .reply(200, { token: "abc", refreshToken: "xyz" });
```

Or simpler: stub `globalThis.fetch` via vi.fn() in each test. The
existing test setup file at `client/lib/__tests__/setup.ts` (or
wherever vitest config points) is where the global helper should live.

**Order of attack:**
1. Start with `auth.ts` — most contracts, most observable. Cover:
   single-flight refresh mutex (session-6 work), 401 retry pathway,
   sessionExpired event emission on refresh failure, normalizeEmail
   passthrough.
2. `sharingApi.ts` next — least state, biggest contract surface.
3. `teamContactsApi.ts` — verifies the link/unlink invariants on
   server's CRUD.
4. `assessmentApi.ts` — relies on hand-rolled status tracking.
5. `discoveryService.ts` — needs both fetch mock AND AsyncStorage
   mock (already in place via expo-secure-store stub).

**Target: at least 2 of the 5 files this session.** Don't try to
close all 5 in one go — fetch-mock test files tend to be 200-400
lines each.

---

### 2. **DiagnosisGroupEditor handler stabilisation** (~1 hour,
source-level)

Same pattern as session 7+8's ProcedureEntryCard work. The file
`client/components/DiagnosisGroupEditor.tsx` has many plain
`handle*` functions that close over diagnosis-group state. Quick
audit:

```bash
grep -n "^  const handle" client/components/DiagnosisGroupEditor.tsx
```

For each, convert to `useCallback` with the minimal-deps + `*Ref`
pattern. Each child receiving the callback as a memo'd prop benefits.

**Note:** Session 7 already did `removeProcedure` / `moveProcedureUp`
/ `moveProcedureDown`. Don't redo those.

---

### 3. **PROCEDURE_CONFIGS.aesthetics.id quirk fix** (~15 min,
source-level — OPTIONAL cosmetic API tidy-up)

`client/lib/procedureConfig.ts` has `aesthetics` registry key
pointing at `BODY_CONTOURING_CONFIG` whose internal id is
`"body_contouring"`. Session 8 locked this quirk in a test
(`"aesthetics shares the body_contouring config object (legacy
merge)"`); fixing it requires:

1. Duplicate the BODY_CONTOURING_CONFIG into an
   `AESTHETICS_CONFIG: ProcedureModuleConfig` with `id: "aesthetics"`
   and identical fields.
2. Point `PROCEDURE_CONFIGS.aesthetics` at the new instance.
3. Update the session-8 test ("aesthetics shares the
   body_contouring config object" → "aesthetics has its own config
   with id 'aesthetics'") and the `config.id matches the registry
   key for every specialty EXCEPT aesthetics` test (now NO
   exceptions).

Cosmetic only. Skip if other priorities consume the budget.

---

### 4. **(Optional, requires sim + tap tooling) Interactive sim
verification** (~1 hour)

Same as session 7+8's deferred cluster. Verify session 5+6+8 fixes
interactively if interactive tap tooling is available:

- **BCRL → ISL staging (session 5)**: case form → Lymphoedema →
  BCRL → confirm staging block reads "ISL Stage" not TNM.
- **Trigger digit multi-select (session 6)**: case form → Hand
  surgery → Elective → Stenosing Tenosynovitis → Trigger
  finger/thumb → confirm 5 DigitMultiSelect chips appear.
- **ProcedureClinicalDetails memo (session 6)**: open a free flap
  case detail; confirm inline FreeFlapClinicalFields render
  correctly.
- **N3c stage display (session 8)**: case form → Skin Cancer →
  Melanoma → record positive nodes + in-transit metastases → verify
  staging chip shows N3c and "Stage IIIC" (or IIID with T4b).
- **Callback-stability perf gains (sessions 7+8)**: case with 3+
  procedures; rapidly type in notes of one; React DevTools render
  count check.

Document captures in `screenshots/` with `s9-` prefix.

---

### 5. **CLAUDE.md drift round 3** (~20 min, source-level — only if
fallback needed)

Session 8 closed round 2. Round 3 is checking whether the session-8
deltas land cleanly in CLAUDE.md once more deltas accumulate:
- Test count tally (currently `1766 across 97 files`)
- testID count (currently `258 unique static + 123 unique dynamic
  = 381`)
- Diagnosis Inventory spot-check (current counts match per session 8)

Skip unless multiple commits land that affect these.

---

## FALLBACK WORK (if all priorities done, or sim/I/O blocked)

Pick the highest-value source-level work that fits.

- **Hunt for dead code** — `client/lib/` exports with zero
  importers. For each `export function X` / `export const X` in a
  lib file, grep for `\bX\b` everywhere else. If 0 hits, the export
  is dead. Same for unused types in `client/types/`.
- **Raw-hex round 4** — re-grep `'#[0-9A-Fa-f]\{3,8\}'` across
  client/. Session 8 confirmed only 2 legitimate values outside
  palette/test files.
- **More callback stabilisation** — beyond DiagnosisGroupEditor,
  hunt for other heavy components with plain handler functions.
  `CaseFormScreen.tsx`, `MediaManagementScreen.tsx`,
  `CaseDetailScreen.tsx`.
- **Server test gaps** — only check if a clinical bug surfaces.
  Otherwise off-limits.

---

## GUARDRAILS

- **Fix inline only OBJECTIVE defects** (dead code, real perf bugs,
  lint warnings pointing to real issues). Do NOT make subjective
  design changes — catalogue them.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- `server/` is **off-limits** unless a clinical bug surfaces.
- **Do not push to remote.** Do not trigger an EAS build.
- Before committing code, `npm run check:types` must stay clean.
  Tests must stay ≥ 1766. Lint warnings must not increase above 2.
- If you flip server-side state for testing, restore it before you
  finish.

## CRASH-RECOVERY

If a cluster goes sideways, `git reset --hard` to the last
known-good commit before the cluster, document the failure in
REPORT-session9.md, move to the next cluster.

## PROVEN WORKING METHOD (from sessions 3–8)

- `__DEV__` debug deep links in `client/components/DevDeepLinkHandler.tsx`:
  `opus://debug/login` (signs in as `m.gladysz@outlook.com`),
  `opus://debug/seed` (22 cases + 1 episode),
  `opus://debug/onboarding`. Fire via
  `xcrun simctl openurl 6AF34D12-7A59-439E-A861-768C5578B00A "<url>"`.
- Screenshots via `xcrun simctl io <udid> screenshot <path>.png`.
- **Maestro 2.5.1 gotchas**:
  - `launchApp` RESETS AsyncStorage. Use deep-link login INSIDE the
    Maestro flow via `openLink`, not before it.
  - Em-dash text matching fails. Use `id:` (testID) selectors.

## END-OF-SESSION PROTOCOL

1. Commit any uncommitted screenshots + the in-progress
   `REPORT-session9.md`.
2. `REPORT-session9.md` needs: TL;DR, triaged findings, a commits
   table, an honest "Coverage & gaps".
3. Update this `NEXT-SESSION-PROMPT.md` for session 10 — rewrite the
   priority list to reflect what's left.
4. Final message to Mateusz: concise — what was done, what's left,
   any critical findings.

## SHAPE EXPECTATIONS

The I/O surface work (Cluster 1) should yield 2-3 commits if 2 files
are closed. DiagnosisGroupEditor stabilisation is 1 commit. The
aesthetics quirk fix is 1 commit if tackled.

Aim for **3-6 commits total** depending on which clusters run.

## TIME BUDGET PER CLUSTER (rough)

| Cluster | Budget | Cumulative |
|---------|--------|------------|
| 1 — I/O test coverage (2 of 5 files) | 3 hours | 3.0h |
| 2 — DiagnosisGroupEditor handler stabilisation | 1 hour | 4.0h |
| 3 — Aesthetics id quirk fix | 15 min (OPTIONAL) | 4.25h |
| 4 — Interactive sim verification | 1 hour (OPTIONAL, if tap tooling) | 5.25h |
| 5 — CLAUDE.md drift round 3 | 20 min (only if needed) | 5.5h |
| Fallback work | variable | until report |

If you finish all priority work plus some fallback by hour 5, write
the report and stop.

## REMINDERS FOR THE NIGHT

- The user is asleep. You will get **no clarification** until
  morning. When in doubt about whether to fix something, **catalogue
  it in the report instead of fixing it**.
- **Don't push to remote.** **Don't trigger EAS / TestFlight builds.**
- **Don't run destructive git ops** (reset --hard onto known-good
  commits is fine within crash-recovery; nothing beyond that).
- If you finish early, **stop**. The morning report should be
  readable in 5 minutes.
- The untracked `.claude/plans/archive/` directory is pre-existing
  scratch — leave it alone.
