# Next-session prompt — Opus visual + functional audit (overnight autonomous run)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. It is designed to run autonomously
> for hours — work the priority list top-down, commit after every cluster, and stop
> cleanly when context gets tight (see "End-of-session protocol").

---

You are continuing a multi-session visual + functional audit of **Opus**, a full-stack
Expo/React Native surgical logbook. Two prior sessions ran on 2026-05-14. **Your job
tonight: drive the iOS simulator autonomously, capture and evaluate the screens the
prior sessions could not reach, fix objective UI defects inline, and catalogue
everything for a later design-polish pass.** Mateusz is asleep — work end-to-end without
checking in, be persistent through friction, and commit progressively so nothing is lost.

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session2.md` — the prior session's full write-up:
   what was fixed (4 real bugs incl. a Critical E2EE one), what was captured (~30
   screens), the **"Coverage & honest gaps"** section (your task list) and the
   **"Tooling notes for the next session"** section (read this carefully — it will save
   you hours of the friction the prior session paid).
2. `.claude/audit-2026-05-14/REPORT.md` — the original prep-session report (environment
   recipe, findings #1–#13).
3. `CLAUDE.md` → **"AI Testing & Visual Quality Standards"** + **"Design Quality &
   Aesthetics"** — the authoritative spec: 40-screen map, 12 specialties, testID
   conventions, theme tokens, the visual QA checklist, and the **Screenshot Evaluation
   Priority** triage (Broken / Wrong / Uncomfortable / Inconsistent / Unpolished).
4. Your auto-loaded memory: `project_mac_dev_env.md` (environment recipe + Maestro
   gotchas) and `feedback_testing_delegation.md` (how Mateusz wants this run).

## ENVIRONMENT BRING-UP

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH=$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
```

- iPhone 17 sim, UDID `6AF34D12-7A59-439E-A861-768C5578B00A`, iOS 26.4. `Opus.app`
  should still be installed. If the build is stale, rebuild:
  `LC_ALL=en_US.UTF-8 npx expo run:ios --device 6AF34D12-7A59-439E-A861-768C5578B00A`.
- API server (`npm run server:dev`, port 5001) and Metro (port 8081) were left running
  by the prior session but **may have died** — verify and restart if needed (Metro:
  `EXPO_PUBLIC_API_URL=http://localhost:5001 npx expo start --dev-client --port 8081`).
- **Verify the API works before driving the UI:**
  `curl -s -X POST http://127.0.0.1:5001/api/auth/login -H "Content-Type: application/json" -d '{"email":"m.gladysz@outlook.com","password":"testtest"}'` → expect a JWT.
  If it 500s, the local DB drifted again — fix with
  `DATABASE_URL="postgresql://localhost:5432/surgical_logbook" npx drizzle-kit push --force`.
- Login is via the dev deep link: `xcrun simctl openurl booted "opus://debug/login"` or
  `maestro test .maestro/audit-login.yaml`. Do **not** fight the sign-in form.

## PROVEN WORKING METHOD (do not re-discover this)

- **Every Maestro flow starts with `launchApp`** — it is the only deterministic anchor
  (always lands on the authenticated dashboard). `back`-chaining and `scrollUntilVisible`
  on long ScrollViews are unreliable; keep flows short and launchApp-anchored.
- Navigation: FAB → `dashboard.fab.btn-main` → `dashboard.fab.btn-log` → AddCaseScreen →
  `addCase.card-{specialty}` → CaseForm → `caseForm.nav.pill-{patient|team|case|operative|media|outcomes}`.
- The dev **LogBox banner** covers the bottom ~90 pt (tab bar). The FAB and case-form
  pills sit *above* it, so most flows don't need it dismissed. For tab navigation, open
  + close the FAB speed dial first. NEVER blind-tap a coordinate to dismiss it.
- Screenshots: `xcrun simctl io booted screenshot <path>` (primary) or Maestro's
  `takeScreenshot`. Theme: `xcrun simctl ui booted appearance light|dark`.
- `expo-mcp` automation tools are NOT available — don't try them.
- Throwaway Maestro flows go in `/tmp/audit-flows/`. Get the full testID list with
  `grep -rhoE 'testID="[^"]*"' client/ | sort -u` plus `tabBarButtonTestID` props.

## THE TASK — priority order (work top-down; each is a committable cluster)

Write screenshots to `.claude/audit-<today's date>/screenshots/` and findings to
`.claude/audit-<today's date>/REPORT-session3.md`. Capture **dark + light** and, where
noted, **iPhone SE 3 (375 pt)**.

1. **Specialty assessment modules WITH a diagnosis selected.** The prior sessions
   captured only the diagnosis *pickers*. Drive each specialty's case form, pick a
   representative diagnosis, and screenshot the rendered assessment module
   (HandTraumaAssessment, SkinCancerAssessment, BreastAssessment, BurnsAssessment,
   etc.). This is the densest custom UI in the app — highest bug yield. No data seeding
   needed.
2. **iPhone SE 3 (375 pt) pass.** Boot `iPhone SE (3rd generation)`, install, re-capture
   the core screens + case form + a few specialty modules. The one known visual finding
   (SectionNavBar truncates "Oper…"/"Outc…") should be checked here first — Phase 7's
   short-label logic is meant to trigger at this width.
3. **Remaining 3 specialties** — `head_neck`, `cleft_cranio`, `general` are not in the
   test account's visible set. Enable all 12 in Settings → Personalisation, then capture
   their case forms + modules.
4. **Settings sub-screens** — EditProfile, ManageFacilities, SurgicalPreferences,
   Personalisation, TeamContacts, SetupAppLock, ChangePassword. (Maestro scroll-to-find
   is flaky on the Settings list — anchor with `launchApp` + a tab tap each time.)
5. **Capture screens** — OpusCamera, GuidedCapture, SmartImport, PlanCase. Grant camera
   first: `xcrun simctl privacy booted grant camera com.drgladysz.opus`.
6. **Seeded-data run** — create ~6 cases across specialties through the case form
   (cases are on-device only; there is no API seed path). Then audit the screens that
   need data: CaseDetail, AddTimelineEvent, AddHistology, EpisodeList, EpisodeDetail,
   NeedsAttentionList, and the *populated* Dashboard + Statistics (charts, deltas,
   milestone timeline).
7. **Onboarding flow** — needs a `clearState` launch; walk Welcome → Features →
   EmailSignup → Categories → Training → Hospital → Privacy, then re-login via the deep
   link.
8. **Full light-theme sweep** — re-run the dark clusters in light for anything not yet
   covered in both themes.

## GUARDRAILS — important, you are running unsupervised

- **Fix inline only OBJECTIVE defects:** raw hex instead of `theme.*` tokens, WCAG
  contrast failures, touch targets < 44 pt, text < 12 pt, text truncation/overflow bugs,
  missing `testID` / `accessibilityRole` / `accessibilityLabel`, and clear functional
  bugs. These map to CLAUDE.md's **Broken / Wrong / Uncomfortable** tiers.
- **Do NOT make subjective design changes** (layout redesigns, "this would look nicer",
  spacing/visual-hierarchy taste calls) autonomously. Catalogue those — with the
  screenshot — under **Inconsistent / Unpolished** in the report for Mateusz's design
  pass. The nav-pill truncation is exactly this kind of call: report it, don't redesign
  the nav bar.
- Respect every CLAUDE.md **locked decision** and **anti-pattern** — especially the
  skin-cancer process design guidelines and the per-module "DO NOT" lists.
- **Do not touch `server/` or `shared/`** — keep the night's work client-only (no
  Railway implications). Do not push to remote. Do not trigger an EAS build.
- Before committing any code change, run `npm run check:types` (must stay clean). The
  pre-commit hook runs lint/format. Make focused, well-described commits per cluster.
- The known-batch backlog (raw-hex sweep ~29 files, case-form Pressable a11y gaps) is a
  separate dedicated session — note *new* instances you see but don't rabbit-hole into
  the whole backlog.
- Local dev API on :5001 only — never point at Railway prod.

## END-OF-SESSION PROTOCOL

When context gets tight (or the priority list is done):
1. Commit any uncommitted screenshots + the in-progress `REPORT-session3.md`.
2. Make sure `REPORT-session3.md` has: a TL;DR, the findings (triaged), a commits table,
   and an honest **"Coverage & gaps"** section listing what's still not done.
3. If the priority list isn't finished, write an updated `NEXT-SESSION-PROMPT.md` (same
   structure as this file) so session 4 can continue.
4. Final message to Mateusz: concise summary — bugs fixed, screens covered, top
   findings for his design pass, what's left.

Be thorough and persistent — Mateusz explicitly wants a long autonomous run and picked
the most comprehensive scope at every fork. Surface real blockers honestly, but only
after genuinely trying to get past them.
