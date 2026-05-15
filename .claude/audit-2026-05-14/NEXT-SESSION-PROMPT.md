# Next-session prompt — Opus audit, session 5 (final polish + product calls)

> Paste everything below the line into a fresh Claude Code session in
> `/Users/mateusz/projects-local/Opus_Logbook`. Designed to run autonomously —
> work the priority list top-down, commit after every cluster, stop cleanly when
> context gets tight (see "End-of-session protocol").

---

You are continuing a multi-session visual + functional audit of **Opus**, a
full-stack Expo/React Native surgical logbook. Sessions 1–4 ran on 2026-05-14/15.
**Session 4 cleared the structural backlog** — dead routes deleted, testID + a11y
gaps closed, raw-hex swept to theme tokens, case-form Pressable a11y fixed,
HeadNeck re-render perf addressed, light-theme NeedsAttention/EpisodeDetail/
Settings captured, CLAUDE.md screen-map corrected (onboarding is 5 steps not 4,
with the no-PIN-skip caveat documented). **Sessions 1–4 landed ~21 commits on
`main` (local, not pushed). The major remaining work is a server session for
the BCRL staging bug + your product calls on the catalogued design-pass items.**

## START HERE — read these first, in order

1. `.claude/audit-2026-05-14/REPORT-session4.md` — the most recent report. Its
   **"Findings — triaged"** + **"Coverage & gaps"** sections are this session's
   task list.
2. `.claude/audit-2026-05-14/REPORT-session3.md` — the session that completed
   the screen-capture brief. Its **"Tooling notes"** section near the top has
   the kAXError workarounds — read them before driving the sim.
3. `.claude/audit-2026-05-14/REPORT-session2.md` + `REPORT.md` — earlier
   findings.
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
- API server (`npm run server:dev`, :5001) + Metro (:8081) may have died — verify
  + restart. Verify the API: `curl -s -X POST http://127.0.0.1:5001/api/auth/login
  -H "Content-Type: application/json" -d '{"email":"m.gladysz@outlook.com","password":"testtest"}'`
  → expect a JWT. If it 500s:
  `DATABASE_URL="postgresql://localhost:5432/surgical_logbook" npx drizzle-kit push --force`.
- Login: `xcrun simctl openurl booted "opus://debug/login"`.
- After ANY client code edit: `xcrun simctl terminate booted com.drgladysz.opus` →
  `curl -s -m 180 "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true" -o /tmp/x.bundle`
  → `xcrun simctl launch booted com.drgladysz.opus` → deep-link login. See
  `REPORT-session3.md` "Tooling notes" for the full method.

## THE TASK — priority order (each is a committable cluster)

The session-4 brief is **done**. The remaining items split into:
*server-session work*, *product calls that need Mateusz*, and *low-priority
polish*. **Confirm with Mateusz before starting** — the highest-value next
session may not be more autonomous audit work. Mateusz's input is needed on:

1. **BCRL lymphoedema TNM-vs-ISL staging bug** (server session — was excluded
   from sessions 2–4 by the audit brief's "do not touch `server/`" guardrail).
   Root cause + suggested fix documented in `REPORT-session3.md`. The fix is:
   in `server/diagnosisStagingConfig.ts`, add `449620005` (Lymphedema of upper
   limb) and any other secondary-cancer lymphoedema SNOMED codes to the ISL
   config's `snomedCtCodes` array so the exact-match branch resolves before
   the keyword-fallback `.find()` can mis-fire on "breast cancer" hitting the
   TNM config first. Recommend: server session, write the fix + add a focused
   unit test (`server/__tests__/diagnosisStagingConfig.test.ts` extension —
   the file exists with 3 tests already). The 4 non-breast post-cancer
   lymphoedema diagnoses are NOT affected (no TNM keywords in their names).

2. **Onboarding no-PIN-skip product call.** `SecurityScreen` (step 5) has no
   skip; every preceding onboarding step does. Confirmed deliberate-feeling
   for a PHI-bearing medical app, but inconsistent. Two reasonable answers:
   (a) accept it and document on the screen ("PIN required to complete
   onboarding"); (b) add "Set up later" affordance for consistency. Documented
   in CLAUDE.md per session 4; needs your call.

3. **Inconsistent / Unpolished design-pass items** catalogued in sessions 2–4.
   None are objective defects — each needs your design eye. Top items, ordered
   by reproduction frequency:
   - **Nav-pill labels ellipsis-truncate** ("Oper…" / "Outc…") at 376–402 pt
     band. Session 2 / 3 / 4 all reproduce. Fix: widen the short-label
     breakpoint in `SectionNavBar.tsx` to cover iPhone 17 width (402 pt) too.
   - **InfectionEpisodeCard episode-number badge text colour** preserved as
     `palette.white` (always-white) in session 4 Cluster 2b. Design system
     says text-on-amber should be `theme.buttonText` (dark in dark mode).
     Verify on-device whether dark-on-amber or white-on-amber reads better in
     dark mode and standardise.
   - **AddCase specialty-card content vertical distribution** is inconsistent
     across cards.
   - **Chip-text truncation in dense grids** (hand-trauma 3-col Injury Type;
     Personalisation 2-col category cards; AddCase specialty grid).
   - **Episode cards show raw patient identifier** where case cards show a
     name (AUDIT-SKIN-02 vs Priya Anand). The episode could resolve the
     linked case's name.
   - **EpisodeDetail "Change Status" amber fill** reads as a current
     selection.
   - **Statistics horizontal-bar labels truncate** ("Orthoplastic & Li…",
     "Auckland City Ho…") — by spec, but worth a deliberate call.

4. **Vestigial code after PlanCase deletion** (session 4 left as-is to avoid
   touching typed JSON storage on a UI-only session). Decide:
   `getPlannedCases` / `getPlannedCaseCount` selectors + `plannedTemplateId`
   field on Case/CaseSummary. Either wire them to a new "Planned Cases"
   filter chip (the in-form plan-mode toggle still sets
   `caseStatus: "planned"`) or delete + delete `plannedCase.test.ts`.

5. **Deferred captures** if you still want them:
   - Light-theme EditProfile / ManageFacilities / SurgicalPreferences /
     TeamContacts / SetupAppLock / SharedInbox. The app follows system
     appearance consistently on every other surface so risk is low.
   - Aesthetics `ImplantDetailsCard` deep capture — needs you to manually
     add a case form > Aesthetics > Breast augmentation — implant and scroll
     past the procedure list. The code path is unit-tested
     (`jointImplant.test.ts` × 44).

6. **On-device verification of session-4 perf fix.** Manual: open the case
   form in `head_neck` specialty, rapidly tap subcategory tabs + diagnosis
   chips, watch for jank improvement vs pre-fix recall. (The
   `kAXErrorInvalidUIElement` flakiness is the proxy symptom — if Maestro
   driving the H&N form stops crashing, the fix worked.)

## GUARDRAILS

- **Fix inline only OBJECTIVE defects.** Sessions 1–4 already covered the
  objective backlog; the remaining items are mostly subjective design calls
  or server-session work.
- Respect every CLAUDE.md **locked decision** and **anti-pattern**.
- **Do not push to remote.** Do not trigger an EAS build. Local dev API on
  :5001 only.
- Before committing code, `npm run check:types` must stay clean. Make focused,
  well-described commits per cluster.

## END-OF-SESSION PROTOCOL

1. Commit any uncommitted screenshots + the in-progress `REPORT-session5.md`.
2. `REPORT-session5.md` needs: TL;DR, triaged findings, a commits table, an
   honest "Coverage & gaps".
3. If the priority list isn't finished, update this `NEXT-SESSION-PROMPT.md`.
4. Final message to Mateusz: concise — what was fixed, what's left, top
   design-pass items.

**Most likely outcome:** this is a short session focused on Mateusz's product
calls + the server-session BCRL fix, not another long autonomous run. The
objective audit work is largely done.
