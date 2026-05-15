# Next-session prompt — Opus audit, session 6 (verification + flows)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. Session 6 is the
> on-device verification pass for session 5's source-level perf +
> correctness fixes, plus the two deferred clusters (Maestro flows +
> deep captures).

---

You are continuing a multi-session visual + functional audit of **Opus**,
a full-stack Expo/React Native surgical logbook. **Sessions 1–5 ran on
2026-05-14/15 and have cleared all the source-level audit findings** —
the 40-screen visual sweep, 11 specialty modules, populated data
surfaces, light theme, iPhone SE 3, dead routes, testID + a11y gaps,
two rounds of raw-hex sweeps, the React.memo perf audit, all 19
react-hooks/exhaustive-deps warnings, 82 of 83 unused-vars warnings,
all 18 import-duplicates, all 29 array-type warnings, the server-side
BCRL lymphoedema TNM-vs-ISL staging bug, and the vestigial PlanCase
helpers. **Session 6 is the on-device verification + Maestro flow + deep
capture pass** — confirm the source-level perf/correctness fixes
actually do what the commit messages claim under the simulator, and
fill the visual-coverage gaps that need fresh tooling.

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session5.md` — most recent. Its
   **"Findings — triaged"** + **"Coverage & gaps"** sections list what
   to verify and the two deferred clusters (Maestro flows, deep
   captures).
2. `.claude/audit-2026-05-14/REPORT-session4.md` — second-most-recent.
3. `.claude/audit-2026-05-14/REPORT-session3.md` — has the **"Tooling
   notes"** section with Maestro 2.5.1 kAXError workarounds. Read
   before driving the sim.
4. `.claude/audit-2026-05-14/REPORT-session2.md` + `REPORT.md` — earlier
   findings (Critical E2EE fix, findings #1–#13).
5. `CLAUDE.md` → "AI Testing & Visual Quality Standards" + "Design
   Quality & Aesthetics".
6. Your auto-loaded memory: `project_mac_dev_env.md`,
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
- API server (`npm run server:dev`, :5001) + Metro (:8081) may have
  died — verify + restart. Verify the API: `curl -s -X POST
  http://127.0.0.1:5001/api/auth/login -H "Content-Type: application/json"
  -d '{"email":"m.gladysz@outlook.com","password":"testtest"}'` → expect
  a JWT. If it 500s:
  `DATABASE_URL="postgresql://localhost:5432/surgical_logbook" npx drizzle-kit push --force`.
- Login: `xcrun simctl openurl booted "opus://debug/login"`.
- Seed: `xcrun simctl openurl booted "opus://debug/seed"` (22 audit
  cases + 1 episode).
- After ANY client code edit: see `REPORT-session3.md` "Tooling notes"
  for the bundle-refresh recipe.

## THE TASK — priority order

Write any new screenshots to `.claude/audit-2026-05-14/screenshots/`,
findings to a new `.claude/audit-2026-05-14/REPORT-session6.md`. Stop
cleanly between clusters if you hit context limits.

### 1. **On-device verification of session 5 fixes** (~30 min)

This is the most valuable thing this session can do. Session 5 landed
7 commits worth of perf + correctness fixes; none of them have been
exercised on-device.

**BCRL staging fix verification** (commit `5706471`):
- Log a case → specialty: Lymphoedema → diagnosis: "BCRL — upper limb".
  Confirm the staging block reads "ISL Stage" (not "TNM T Stage / N
  Stage"). Capture screenshot.
- Repeat with "Post-melanoma lymphoedema — upper limb" and
  "Post-melanoma lymphoedema — lower limb".
- Also spot-check 2-3 other lymphoedema diagnoses to confirm they
  still resolve correctly (post-gynaecological, post-radiation,
  primary).

**React.memo perf verification** (commits `3ce67ea` from session 4 +
`d5e2796` from session 5):
- Open the case form in Head & Neck specialty → rapidly tap subcategory
  tabs + diagnosis chips. Watch for jank vs the pre-session-4 baseline.
- Repeat with peripheral_nerve specialty (uses DiagnosisPicker — newly
  memoized).
- Repeat with elective hand (uses HandElectivePicker — newly memoized).
- Run `.maestro/case-form-happy.yaml` 5× in a row. Pre-session-4 it
  was kAXError-prone on dense specialty pickers; if sessions 4 + 5
  perf wins are real, all 5 runs should be clean.

**Aesthetics no-regression check** (commit `5476b98`):
- Session 5 deleted 3 unused useMemo blocks in
  `AestheticProcedureFirstFlow` (acgmeSubcategory, interventionType,
  inferredDiagnosisId). If these were *meant* to render somewhere
  (ACGME coding badge?), the visual output is now different. Capture
  the aesthetics procedure-first flow end-to-end and compare against
  any session-2/3 captures you find in the screenshots directory.

### 2. **Maestro regression flow extensions** (~30 min)

3 flows proposed in session 4's brief, none added yet:

- `case-form-skin-cancer.yaml` — drive the `SkinCancerAssessment` via
  testIDs (pathway gate, lesion details, histology). Uses the
  `screen-onboardingCategories`-style testIDs added in session 4.
- `onboarding-replay.yaml` — drives the 5-step onboarding via
  `opus://debug/onboarding` + the new `onboarding.*` testIDs from
  session 4 commit `5606eaa`.
- `attention-card-actions.yaml` — drives the dashboard's
  AttentionCard quick actions (Histology, + Event, Discharge, Log
  Case, + Episode).

Each ~20 lines per the existing patterns in `.maestro/dashboard-smoke.yaml`,
`case-form-happy.yaml`, `applock-pin.yaml`. Use `id:` selectors only,
never `text:`.

### 3. **Deep specialty captures** (~1 hour)

Session 4 partially captured Aesthetics but didn't reach the deepest
nested `ImplantDetailsCard` (procedure-card-driven flow). Try again
with fresh tooling — the case-form pill-nav coordinate-tap was the
friction.

Surfaces to reach:
- Aesthetics > Breast augmentation — implant procedure selected →
  `ImplantDetailsCard` rendered below
- Per-procedure team footer (`ProcedureTeamFooter`) on a case with 2+
  procedures
- Joint implant arthroplasty (hand_elective with CMC1/PIP/MCP
  arthroplasty procedure selected → `JointImplantSection` renders)
- Burns acute case with TBSA regional breakdown + body outline
- Free flap details with anastomosis entry card

If Maestro nav is still flaky, fall back to the seeded breast case
(`audit-breast-01` from `opus://debug/seed`) which already has DIEP
flap details, then drill into per-procedure card.

### 4. **Aesthetics inferredDiagnosis regression check** (~15 min)

Specifically because session 5 deleted these without on-device
verification:

- `acgmeSubcategory = useMemo(() => primaryProcedureId ? getAcgmeSubcategory(primaryProcedureId) : undefined, [primaryProcedureId])`
- `interventionType = useMemo(() => primaryProcedureId ? getInterventionType(primaryProcedureId) : undefined, [primaryProcedureId])`
- `inferredDiagnosisId = useMemo(() => primaryProcedureId ? resolveAutoInferredDiagnosisId(primaryProcedureId, currentIntent) : undefined, [primaryProcedureId, currentIntent])`

These were declared but never read (the lint warning was real). But
if a future-Mateusz had intended to render `acgmeSubcategory` as a
badge or `inferredDiagnosisId` as an auto-suggestion, the feature is
now silently broken. Drive the Aesthetics procedure-first flow and
confirm nothing visually disappeared compared to session 2/3 captures.

If the captures don't match, the helper imports
(`resolveAutoInferredDiagnosisId`, `getAcgmeSubcategory`,
`getInterventionType`) need to be re-added with their useMemo bodies
restored. The diff is small (one commit's worth).

### 5. **Optional — `handleMultiDigitConfirm` decision** (~15 min)

`client/components/DiagnosisGroupEditor.tsx` has a 50-line useCallback
named `handleMultiDigitConfirm` that's defined and committed but
never wired up. The comment says "Multi-digit confirm: create
per-digit procedures from resolution map". Looks like a half-shipped
feature.

This needs Mateusz's call, not yours — but you can usefully prepare:

- Search git log for "multi-digit" to find when it was committed
- Read the multi-digit selector UI it would presumably be hooked to
  (`DigitMultiSelect` component? `selectedDigits` state?)
- Document in `REPORT-session6.md` what the intended flow is, so
  Mateusz can decide quickly: wire it up vs delete

If the decision is obvious from the surrounding code (e.g. the
DigitMultiSelect already has a `onConfirm` prop and
`handleMultiDigitConfirm` matches its shape exactly), wire it up.

### 6. **Optional — On-device 30-Day Review audit** (~15 min)

Carried forward from session 4 — verify the timezone fix is still
correct after another session of refactors. Pre-fix it showed
off-by-one days in the post-op review banner. Drive an inpatient case
with `procedureDate: 2 days ago` and confirm "Review available in 28
days".

## GUARDRAILS

- **Fix inline only OBJECTIVE defects** found during verification.
  Don't make subjective design changes — catalogue them.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- `server/` is **back to off-limits** unless another clinical bug
  surfaces during the verification work.
- **Do not push to remote.** Do not trigger an EAS build. Local dev
  API on :5001 only.
- Before committing code, `npm run check:types` must stay clean.
  Tests must stay at 1547/1547 (or higher if you added some).
- If you flip server-side state for testing, restore it before you
  finish.

## PROVEN WORKING METHOD (from sessions 3–5)

- **Three `__DEV__` debug deep links** in
  `client/components/DevDeepLinkHandler.tsx`: `opus://debug/login`,
  `opus://debug/seed` (22 audit cases + 1 episode),
  `opus://debug/onboarding`. Fire via `xcrun simctl openurl booted
  "<url>"`.
- **After ANY client code edit, force a fresh Metro bundle before
  testing.** Recipe in `REPORT-session3.md` "Tooling notes".
- **`kAXErrorInvalidUIElement` workaround: coordinate-tap.** Take a
  screenshot first to get the coordinate. Skipping the hierarchy
  query prevents the crash.
- **`retryTapIfNoChange: false`** on toggles. **LogBox dismiss** via
  tap at `94%,93%`.
- Screenshots: `.claude/audit-screenshot.sh <path>` (downscales to
  ≤1568 px). Theme: `xcrun simctl ui booted appearance light|dark`.

## END-OF-SESSION PROTOCOL

1. Commit any uncommitted screenshots + the in-progress `REPORT-session6.md`.
2. `REPORT-session6.md` needs: TL;DR, triaged findings, a commits
   table, an honest "Coverage & gaps".
3. If the priority list isn't finished, update this
   `NEXT-SESSION-PROMPT.md` for session 7.
4. Final message to Mateusz: concise — what was verified, what's still
   uncertain, any new findings, and (if `handleMultiDigitConfirm`
   touched) a "please decide" note.

Session 6 should be SHORTER than sessions 2 or 4 (those did broad
mechanical work; this one is targeted verification + 3 small Maestro
flows + a handful of captures). Aim for 3–5 commits.
