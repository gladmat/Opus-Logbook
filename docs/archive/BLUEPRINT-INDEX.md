# Archived Blueprints — classification index

The six blueprints below were checked against the live codebase on **2026-07-24**.
All six are **implemented** and therefore belong in `archive/`.

> **Source documents not found in the repo.** None of these blueprint `.md`
> files exist in the working tree (searched repo root, `.claude/plans/`, and the
> whole tree excluding `node_modules`/`.git`/stale worktrees). They were most
> likely pasted into the Claude.ai project knowledge only. To archive the full
> text, paste each source into a file beside this index. This index records the
> classification + evidence in the meantime.

| Blueprint | Status | Source `.md` in repo? | Evidence (live codebase) |
| --- | --- | --- | --- |
| Burns module implementation | ✅ Implemented | ❌ Missing | `client/components/burns/BurnsAssessment.tsx` + `client/lib/burnsConfig.ts` + `burnsDiagnoses.ts` (19 entries) |
| Elective hand implementation guide | ✅ Implemented | ❌ Missing | `client/components/hand-elective/HandElectivePicker.tsx`, `client/components/dupuytren/DupuytrenAssessment.tsx` |
| Peripheral nerve remediation | ✅ Implemented | ❌ Missing | `client/components/peripheral-nerve/PeripheralNerveAssessment.tsx` (+ BrachialPlexus / Neuroma sub-modules) |
| Onboarding blueprint v2 | ✅ Implemented | ❌ Missing | `client/screens/onboarding/` (10 screens: Welcome, FeaturePager, Categories, Training, Hospital, Privacy, Security, Auth, EmailSignup…); legacy `OnboardingScreen.tsx` deleted |
| Free flap registry upgrade v3 | ✅ Implemented (base module) | ❌ Missing | `client/components/FreeFlapPicker.tsx`, `FlapOutcomeSection.tsx`, `FlapSpecificFields.tsx`, `client/lib/flapFieldConfig.ts`, `FreeFlapDetails` in `client/types/case.ts`. NOTE: the specific "v3 registry upgrade" scope could not be diffed against a source doc (missing) — only presence of the free-flap module is confirmed. |
| Episode architecture spec | ✅ Implemented | ❌ Missing | `TreatmentEpisode` in `client/types/episode.ts` + local encrypted episode storage. NOTE: episodes are on-device encrypted, not a Postgres table — no `procedure_outcomes` table exists in `shared/schema.ts` (by design). |

`docs/blueprints/` is currently **empty** — no unimplemented blueprints tracked.
