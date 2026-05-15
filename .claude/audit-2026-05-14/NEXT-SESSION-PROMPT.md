# Next-session prompt — Opus audit, session 4 (follow-up + backlog)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. Designed to run autonomously —
> work the priority list top-down, commit after every cluster, stop cleanly when
> context gets tight (see "End-of-session protocol").

---

You are continuing a multi-session visual + functional audit of **Opus**, a
full-stack Expo/React Native surgical logbook. Sessions 1–3 ran on 2026-05-14/15.
**Session 3 completed the full screen-capture brief** — all 11 specialty modules,
the 40-screen map, the 5-step onboarding flow, populated data surfaces, iPhone
SE 3, and a light-theme sweep are all captured and evaluated. The app's visual
craftsmanship was found to be strong: only **two** Broken/Wrong layout bugs
across everything, both fixed. **Your job now is the follow-up backlog** — the
structural findings sessions 1–3 reported but did not fix, plus a few capture
gaps. Mateusz is asleep — work end-to-end, be persistent through friction, commit
progressively.

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session3.md` — the most recent report. Its
   **"Findings — triaged"** section IS your task list; its **"Coverage & gaps"**
   section lists exactly what's left. Read the **"Tooling notes"** section near
   the top — the kAXError workarounds will save you hours.
2. `.claude/audit-2026-05-14/REPORT-session2.md` + `REPORT.md` — earlier findings
   (the Critical E2EE fix, findings #1–#13).
3. `CLAUDE.md` → "AI Testing & Visual Quality Standards" + "Design Quality &
   Aesthetics" — the authoritative spec.
4. Your auto-loaded memory: `project_mac_dev_env.md`, `project_opus_visual_audit.md`,
   `feedback_testing_delegation.md`.

## ENVIRONMENT BRING-UP

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH=$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
```

- iPhone 17 sim, UDID `6AF34D12-7A59-439E-A861-768C5578B00A`, iOS 26.4. `Opus.app`
  should still be installed. Rebuild only if stale:
  `LC_ALL=en_US.UTF-8 npx expo run:ios --device 6AF34D12-7A59-439E-A861-768C5578B00A`.
- API server (`npm run server:dev`, :5001) + Metro (:8081) may have died — verify
  + restart. Verify the API: `curl -s -X POST http://127.0.0.1:5001/api/auth/login
  -H "Content-Type: application/json" -d '{"email":"m.gladysz@outlook.com","password":"testtest"}'`
  → expect a JWT. If it 500s: `DATABASE_URL="postgresql://localhost:5432/surgical_logbook" npx drizzle-kit push --force`.
- Login: `xcrun simctl openurl booted "opus://debug/login"`.

## PROVEN WORKING METHOD (session 3 — do not re-discover)

- **Three `__DEV__` debug deep links exist** (`client/components/DevDeepLinkHandler.tsx`):
  `opus://debug/login`, `opus://debug/seed` (22 audit cases + 1 episode), and
  `opus://debug/onboarding` (replays the post-auth onboarding flow). Fire via
  `xcrun simctl openurl booted "<url>"`.
- **After ANY client code edit, force a fresh Metro bundle before testing.**
  `launchApp` alone serves a stale bundle. Recipe:
  `xcrun simctl terminate booted com.drgladysz.opus` →
  `curl -s -m 180 "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true" -o /tmp/x.bundle`
  (this blocks until Metro rebuilds; `grep` your change in `/tmp/x.bundle` to confirm)
  → `xcrun simctl launch booted com.drgladysz.opus` → deep-link login.
- **`kAXErrorInvalidUIElement` is the #1 friction.** Maestro 2.5.1's `tapOn`
  hierarchy query crashes intermittently — worst on dense screens (Settings list,
  case form, NeedsAttentionList). **Workaround: coordinate-tap (`tapOn: { point: "x%,y%" }`)
  — a point tap needs no hierarchy query.** Take a screenshot first to get the
  coordinate. This is how session 3 got past the Settings list and the onboarding
  CTAs.
- **`launchApp` cold-restarts the dev client** — it loses in-memory state. For
  stateful flows (onboarding replay), do NOT `launchApp` in the Maestro flow;
  fire the deep link from the host, then run a flow that starts with
  `waitForAnimationToEnd` and drives from the current screen.
- **`retryTapIfNoChange: false`** is mandatory on toggle-type elements (FAB,
  chips). The LogBox dev banner covers the bottom ~90 pt — dismiss with
  `tapOn: { point: "94%,93%" }` guarded by `runFlow when visible text:".*Open debugger.*"`.
- Screenshots: `.claude/audit-screenshot.sh <path>` (downscales to ≤1568 px).
  Theme: `xcrun simctl ui booted appearance light|dark`.
- Throwaway Maestro flows go in `/tmp/audit-flows/` with a `run.sh` runner
  (per-flow timeout + `pkill` + one retry). Session 3 left its flows there, but
  `/tmp` may have been cleared since — if so, recreate them; every pattern you
  need is documented in this section, so a flow is ~10 lines.

## THE TASK — priority order (each is a committable cluster)

Write any new screenshots to `.claude/audit-2026-05-14/screenshots/`, findings to
a new `.claude/audit-2026-05-14/REPORT-session4.md`.

1. **Two dead routes — `PlanCase` and `EpisodeList`.** Both are registered in
   `RootStackNavigator.tsx` but nothing calls `navigation.navigate(...)` for them.
   Investigate git history / surrounding code to decide delete-vs-rewire for each.
   `PlanCase` was almost certainly superseded by the in-form plan-mode toggle —
   likely a clean delete. `EpisodeList` (full SectionList screen, `episodes.input-search`)
   may have lost its entry point in a refactor — check whether it *should* be
   reachable (e.g. from a Settings row or an episode-related surface). Fix
   whichever way is correct; this is an objective dead-code finding.
2. **testID + a11y backlog.** Add `testID` + `accessibilityRole`/`accessibilityLabel`
   to: `client/components/ProcedureSubcategoryPicker.tsx` procedure rows
   (`caseForm.procedure.row-${entry.id}`), `client/components/dashboard/AttentionCard.tsx`
   (the card + its quick-action buttons), and the 5 onboarding screens
   (`CategoriesScreen` / `TrainingScreen` / `HospitalScreen` / `PrivacyScreen` /
   `SecurityScreen` — CLAUDE.md's screen map cites `onboarding.*` testIDs that
   don't exist). Then the pre-existing batch: raw-hex sweep (~29 files — see
   REPORT.md finding #10) + case-form Pressable a11y gaps (REPORT.md finding #11).
   This is large but mechanical and squarely "fix inline".
3. **CLAUDE.md screen-map fix.** The post-auth onboarding is **5 steps**, not 4 —
   `SecurityScreen` ("Secure your logbook", PIN setup) follows Privacy. Update the
   screen-map section. Also note in CLAUDE.md that onboarding cannot be *completed*
   without setting a PIN (`SecurityScreen` has no skip) — confirm with Mateusz
   whether that is intended.
4. **HeadNeck / case-form re-render perf investigation.** `HeadNeckDiagnosisPicker`
   is unusually `kAXErrorInvalidUIElement`-prone, which usually means continuous
   re-rendering. Connect React DevTools, do a "highlight re-renders" pass on the
   case form + `HeadNeckDiagnosisPicker`. If it re-renders on a loop, that's a
   real perf bug (jank on the 88-diagnosis picker) — fix it.
5. **Remaining light-theme captures** — light NeedsAttentionList, EpisodeDetail,
   Settings sub-screens (session 3's light run died partway on the kAXError-flaky
   NeedsAttention nav). Low-risk; nice-to-have for completeness.
6. **Deeper module coverage** — session 3 captured specialty modules at
   "diagnosis selected + scrolled"; the deepest nested cards (Aesthetics
   `ImplantDetailsCard`, per-procedure footers, etc.) were not all reached.

> **NOT for this session (needs a server session):** the BCRL lymphoedema
> TNM-vs-ISL staging bug in `server/diagnosisStagingConfig.ts` — the audit brief
> forbids touching `server/`. Flag it to Mateusz instead.

## GUARDRAILS

- **Fix inline only OBJECTIVE defects:** dead code/routes, missing
  `testID`/`accessibilityRole`/`accessibilityLabel`, raw hex instead of `theme.*`,
  WCAG contrast failures, <44 pt targets, <12 pt text, truncation/overflow bugs,
  clear functional bugs. **Do NOT make subjective design changes** — catalogue
  Inconsistent/Unpolished items for Mateusz's design pass.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- **Do not touch `server/` or `shared/`.** Do not push to remote. Do not trigger
  an EAS build. Local dev API on :5001 only.
- Before committing code, `npm run check:types` must stay clean. Make focused,
  well-described commits per cluster.
- If you flip server-side state for testing (e.g. `onboardingComplete`), restore
  it before you finish — `PUT /api/profile` with the test-account JWT.

## END-OF-SESSION PROTOCOL

1. Commit any uncommitted screenshots + the in-progress `REPORT-session4.md`.
2. `REPORT-session4.md` needs: TL;DR, triaged findings, a commits table, an
   honest "Coverage & gaps".
3. If the priority list isn't finished, update this `NEXT-SESSION-PROMPT.md`.
4. Final message to Mateusz: concise — what was fixed, what's left, top design-pass items.

Be thorough and persistent. Mateusz wants a long autonomous run and the most
comprehensive scope at every fork.
