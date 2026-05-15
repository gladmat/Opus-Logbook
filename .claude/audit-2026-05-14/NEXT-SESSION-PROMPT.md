# Next-session prompt — Opus audit, session 5 (overnight run)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. Designed to run autonomously
> through the night — work the priority list top-down, commit after every
> cluster, stop cleanly when context gets tight (see "End-of-session
> protocol"). Mateusz is asleep.

---

You are continuing a multi-session visual + functional audit of **Opus**, a
full-stack Expo/React Native surgical logbook. **Sessions 1–4 ran on
2026-05-14/15 and have cleared the original audit backlog** — the 40-screen
visual sweep, 11 specialty modules, populated data surfaces, light theme,
iPhone SE 3, dead routes, testID + a11y gaps, the easy raw-hex sweep, and a
HeadNeck re-render perf fix are all done. **Session 5 is the deeper-quality
pass** — perf audit beyond HeadNeck, lint cleanup, server-side BCRL fix,
remaining raw-hex sweep, and a few capture gaps that need fresh eyes.

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session4.md` — most recent. Its
   **"Findings — triaged"** + **"Coverage & gaps"** sections feed into this
   session's priority list. It also documents what *not* to redo.
2. `.claude/audit-2026-05-14/REPORT-session3.md` — completed the
   screen-capture brief. Its **"Tooling notes"** has the Maestro 2.5.1
   kAXError workarounds — read them before driving the sim.
3. `.claude/audit-2026-05-14/REPORT-session2.md` + `REPORT.md` — earlier
   findings (Critical E2EE fix, findings #1–#13).
4. `CLAUDE.md` → "AI Testing & Visual Quality Standards" + "Design Quality &
   Aesthetics" — the authoritative spec.
5. Your auto-loaded memory: `project_mac_dev_env.md`,
   `project_opus_visual_audit.md`, `feedback_testing_delegation.md`.

## ENVIRONMENT BRING-UP

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH=$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
```

- iPhone 17 sim, UDID `6AF34D12-7A59-439E-A861-768C5578B00A`, iOS 26.4.
  `Opus.app` should still be installed. Rebuild only if stale:
  `LC_ALL=en_US.UTF-8 npx expo run:ios --device 6AF34D12-7A59-439E-A861-768C5578B00A`.
- API server (`npm run server:dev`, :5001) + Metro (:8081) may have died —
  verify + restart. Verify the API: `curl -s -X POST
  http://127.0.0.1:5001/api/auth/login -H "Content-Type: application/json"
  -d '{"email":"m.gladysz@outlook.com","password":"testtest"}'` → expect a
  JWT. If it 500s:
  `DATABASE_URL="postgresql://localhost:5432/surgical_logbook" npx drizzle-kit push --force`.
- Login: `xcrun simctl openurl booted "opus://debug/login"`.
- After ANY client code edit: `xcrun simctl terminate booted com.drgladysz.opus` →
  `curl -s -m 180 "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true" -o /tmp/x.bundle`
  → `xcrun simctl launch booted com.drgladysz.opus` → deep-link login. See
  `REPORT-session3.md` "Tooling notes" for the full method.

## THE TASK — priority order (each is a committable cluster)

Write any new screenshots to `.claude/audit-2026-05-14/screenshots/`,
findings to a new `.claude/audit-2026-05-14/REPORT-session5.md`. **Work the
list top-down**; each cluster is independently committable. Stop cleanly
between clusters if you hit context limits.

### 1. **Server BCRL lymphoedema TNM-vs-ISL staging bug fix** (~30 min)

The audit brief explicitly excluded `server/` from sessions 2–4. Session 5
**IS allowed** to touch `server/` — this is the only known clinical-data
bug in the audit. Root cause + fix documented in `REPORT-session3.md`:

In `server/diagnosisStagingConfig.ts`, the `getStagingForDiagnosis()`
function does an exact `snomedCtCodes` match first, then falls back to
keyword `.find()`. The BCRL diagnoses (`lymph_dx_bcrl_upper`,
`lymph_dx_bcrl_breast`) carry SNOMED `449620005` (Lymphedema of upper
limb), which is NOT in the ISL config's `snomedCtCodes` — so it falls
through to keyword fallback, and "breast cancer" hits the TNM config
first (defined earlier in the array). Wrong staging block renders.

**Fix:** add `449620005` (and any other secondary-cancer lymphoedema SNOMED
codes — check what the BCRL diagnosis entries declare) to the ISL config's
`snomedCtCodes` array. Then extend `server/__tests__/diagnosisStagingConfig.test.ts`
(currently 3 tests) with a test that:
- asserts `getStagingForDiagnosis("lymph_dx_bcrl_upper")` returns the ISL
  config, not TNM
- asserts the existing 4 non-breast post-cancer lymphoedema diagnoses
  (post-gynaecological, etc.) still correctly resolve to ISL via the
  keyword fallback (regression guard)

**Verification:** on-device — drive a `lymphoedema` specialty case in the
form, pick "BCRL — upper limb", confirm the staging block is "ISL Stage"
not "TNM T Stage / N Stage". Capture before/after screenshots.

### 2. **Broader React.memo perf audit** (~1–2 hours)

Session 4's HeadNeck fix addressed one of N dense pickers. Audit the rest.
**Components confirmed NOT memoized** (grep output from session-4 close):

- `client/components/DiagnosisPicker.tsx` — generic picker used by EVERY
  non-H&N specialty (286 diagnoses across all specialties)
- `client/components/ProcedureSubcategoryPicker.tsx` — used by Aesthetics
  procedure-first flow + breast + H&N
- `client/components/hand-elective/HandElectivePicker.tsx`
- `client/components/FreeFlapPicker.tsx` — 18 flap types
- `client/components/skin-cancer/SkinCancerAssessment.tsx` — orchestrator
  with multiple internal collapsible sections
- `client/components/hand-trauma/HandTraumaAssessment.tsx` — the densest
  custom-UI component in the app (per CLAUDE.md)

For each: **verify the call site's props are stable** (the parent uses
`useCallback` for `onSelect` etc.) before wrapping in `React.memo`. If
props aren't stable, wrap them at the call site too — re-render gating
only works when the parent's props are reference-stable. The
`HeadNeckDiagnosisPicker` fix in commit `3ce67ea` is the template.

**`useCaseForm.ts` reducer perf:** look at line 2342 area (
react-hooks/exhaustive-deps warning: "The 'updateProcedure' function makes
the dependencies of useCallback Hook (at line 2342) change on every
render"). This is an unstable callback that breaks memoization downstream
— wrap `updateProcedure` in its own `useCallback`.

**Anastomoses callback at AnastomosisEntryCard.tsx:536** — another
"logical expression could make the dependencies of useCallback Hook
change on every render". Fix the same way.

### 3. **react-hooks/exhaustive-deps cleanup** (~1–2 hours)

`npm run lint` reports **19 react-hooks/exhaustive-deps warnings** — most
are real perf bugs (complex expressions in dependency arrays defeat
memoization) or stale-closure risks. Walk through them systematically:

```bash
npm run lint 2>&1 | grep "react-hooks/exhaustive-deps" -B 2
```

The "complex expression in the dependency array" warnings (~10 of them,
clustered in `DiagnosisGroupEditor.tsx`) are the most fixable: extract the
complex expression to a useMemo, use the memoized value in the dep array.
The missing-dependency warnings are usually intentional but still
warrant a code comment + ESLint-disable.

Don't bulk-fix blindly — read each in context. Some intentional deps
omissions exist (e.g. mount-only effects); leave those with a `// eslint-disable-next-line react-hooks/exhaustive-deps` + a comment explaining why.

### 4. **Wider raw-hex sweep — round 2** (~1 hour)

Session 4 hit ~70 raw-hex usages across 23 files. **29 files still have
raw hex, totalling ~126 instances.** Most were deferred as
"intentional semantic distinguishers" but on a closer look many are
objectively wrong per CLAUDE.md ("always theme.* or palette.*"):

- `MultiLesionEditor` `PATHOLOGY_OPTIONS` (BCC blue `#2563EB`, SCC amber
  `#E5A00D`, Melanoma purple `#7C3AED`, Benign green `#059669`, Other
  grey `#6B7280`) — these mirror `theme.specialty`'s pattern. Add a
  `theme.pathology.{bcc,scc,melanoma,benign,other}` palette in
  `client/constants/theme.ts` and migrate.
- `peripheral-nerve/BrachialPlexusDiagram.tsx` SVG strokes — semantic
  clinical colors (severity levels). Add a similar
  `theme.nerveSeverity.*` token batch.
- `burns/TBSABodyOutline.tsx` burn-depth colors — same story.
  `theme.burnDepth.{sunburn,superficial,partial,full}` would be the
  pattern.
- `OpusCameraScreen` semi-transparent overlays — these can stay since
  they're rgba on always-black, but the `"#2EA043"` captured-dot can
  become `theme.success`.
- `peripheral-nerve/NeuromaAssessment.tsx:865` — `"#E5A00D40"` literal
  borderLeftColor → `theme.accent + "40"`.

**Be conservative.** Anything that's truly always-meant-to-be-this-color
regardless of theme can stay as `palette.*`; anything that adapts to
theme should be a `theme.*` token. When adding new theme tokens, mirror
the existing pattern (light + dark variants, all 12 specialties or
similar).

### 5. **Vestigial code cleanup after PlanCase deletion** (~30 min)

Session 4 left vestigial `getPlannedCases` / `getPlannedCaseCount`
selectors in `client/lib/dashboardSelectors.ts` + `plannedTemplateId`
field on `Case`/`CaseSummary`. Decision needed:

**Option A — re-wire:** add a "Planned Cases" filter chip to the
dashboard's `SpecialtyFilterBar` that filters to `caseStatus: "planned"`.
The in-form plan-mode toggle still creates planned cases, so the
infrastructure has real value.

**Option B — delete:** remove the two selectors + the
`plannedCase.test.ts` file (66 tests for dead code is wasteful) +
the `plannedTemplateId` field with a code-comment in the types file
explaining the deletion timeline.

**Recommend Option A** if you can find a clean dashboard UX for it
(otherwise it's a 12th filter chip pushing the bar off-screen — careful
on iPhone SE 3 width). Default to Option B if Option A's UX is awkward.

### 6. **Other lint cleanup — unused vars + duplicate imports** (~30 min)

`npm run lint` reports 83 `@typescript-eslint/no-unused-vars` warnings
and 18 `import/no-duplicates` warnings. The duplicate-imports auto-fix
is safe (`npm run lint:fix` handles them). The unused-vars need
case-by-case review — some are real dead code (delete), some are
intentional placeholders (rename to `_var` to satisfy the rule).

Also 8 `@typescript-eslint/no-explicit-any` — these are real type-safety
gaps. Walk them and tighten where possible.

### 7. **Maestro regression flow extensions** (~30 min)

The existing 3 flows (`.maestro/dashboard-smoke.yaml`,
`case-form-happy.yaml`, `applock-pin.yaml`) don't exercise the new
testIDs added in sessions 2–4. Add 2–3 focused flows:

- `case-form-skin-cancer.yaml` — drive the SkinCancerAssessment via
  testIDs (pathway gate, lesion details, histology). Uses the
  `screen-onboardingCategories`-style testIDs from session 4.
- `onboarding-replay.yaml` — drives the 5-step onboarding via
  `opus://debug/onboarding` + the new `onboarding.*` testIDs.
- `attention-card-actions.yaml` — drives the dashboard's
  AttentionCard quick actions (Histology, + Event, Discharge, Log Case,
  + Episode).

Each flow ~20 lines per the existing patterns.

### 8. **Deep specialty module captures** (~1 hour, low priority)

Session 4 partially captured Aesthetics but didn't reach the deepest
nested `ImplantDetailsCard` (procedure-card-driven flow). Try again with
fresh tooling — the case-form pill-nav coordinate-tap was the friction.

Surfaces to reach:
- Aesthetics > Breast augmentation — implant procedure selected →
  `ImplantDetailsCard` rendered below
- Per-procedure team footer (`ProcedureTeamFooter`) on a case with 2+
  procedures
- Joint implant arthroplasty (hand_elective with CMC1/PIP/MCP
  arthroplasty procedure selected → `JointImplantSection` renders)
- Burns acute case with TBSA regional breakdown + body outline
- Free flap details with anastomosis entry card

If Maestro nav is still flaky, drop down to xcrun simctl + manual
xcrun simctl openurl with deep links, or use the seeded breast case
(`audit-breast-01` from `opus://debug/seed`) which already has DIEP
flap details.

### 9. **(Optional) On-device perf verification** (~30 min)

Manual: open the case form in `head_neck` specialty, rapidly tap
subcategory tabs + diagnosis chips, watch for jank vs pre-fix.
If the React.memo fix worked, Maestro driving the H&N form should
stop crashing with kAXErrorInvalidUIElement. Run
`.maestro/case-form-happy.yaml` 5 times in a row — pre-fix it
crashed intermittently; post-fix should be 5/5 clean.

## GUARDRAILS

- **Fix inline only OBJECTIVE defects** (dead code, missing testID/a11y,
  raw hex per CLAUDE.md, WCAG, <44pt targets, <12pt text, perf bugs with
  measurable signals, lint warnings that point to real issues). **Do NOT
  make subjective design changes** — catalogue Inconsistent/Unpolished
  items for Mateusz's design pass.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- `server/` is **ALLOWED this session** (Cluster 1 BCRL fix). `shared/`
  is still off-limits unless directly necessary for Cluster 1.
- **Do not push to remote.** Do not trigger an EAS build. Local dev API
  on :5001 only.
- Before committing code, `npm run check:types` must stay clean. Tests
  must stay at 1540/1540 (or higher if you added some). Make focused,
  well-described commits per cluster.
- If you flip server-side state for testing (e.g. `onboardingComplete`),
  restore it before you finish — `PUT /api/profile` with the test-account
  JWT.

## PROVEN WORKING METHOD (from sessions 3–4)

- **Three `__DEV__` debug deep links** in
  `client/components/DevDeepLinkHandler.tsx`: `opus://debug/login`,
  `opus://debug/seed` (22 audit cases + 1 episode), `opus://debug/onboarding`.
  Fire via `xcrun simctl openurl booted "<url>"`.
- **After ANY client code edit, force a fresh Metro bundle before testing.**
  Recipe in `REPORT-session3.md` "Tooling notes".
- **`kAXErrorInvalidUIElement` workaround: coordinate-tap.** Take a
  screenshot first to get the coordinate. Skipping the hierarchy query
  prevents the crash.
- **`retryTapIfNoChange: false`** on toggles. **LogBox dismiss** via tap
  at `94%,93%`.
- Screenshots: `.claude/audit-screenshot.sh <path>` (downscales to ≤1568 px).
  Theme: `xcrun simctl ui booted appearance light|dark`.

## END-OF-SESSION PROTOCOL

1. Commit any uncommitted screenshots + the in-progress `REPORT-session5.md`.
2. `REPORT-session5.md` needs: TL;DR, triaged findings, a commits table, an
   honest "Coverage & gaps".
3. If the priority list isn't finished, update this `NEXT-SESSION-PROMPT.md`
   for session 6.
4. Final message to Mateusz: concise — what was fixed, what's left, top
   design-pass items + (if BCRL fix landed) a "please verify on-device" note.

Be thorough and persistent. Mateusz wants a long autonomous run and the
most comprehensive scope at every fork. Sessions 2 and 4 hit ~6-8 commits
each in their long-runs — that's the target shape.

**Order of attack hint:** Clusters 1 (server BCRL) + 5 (vestigial cleanup)
are small + closed-form — do them first to lock in early wins. Cluster 2
(React.memo audit) + 3 (exhaustive-deps) are the big perf-win opportunities
and should be the bulk of the session. Cluster 4 (raw-hex round 2) is
mechanical filler. Clusters 6 + 7 + 8 are nice-to-have; do them only if
context allows.
