# Team Sharing — Contact Linking Failure Analysis & Improvement Plan

**Date:** 2026-07-23
**Status:** IMPLEMENTED IN FULL 2026-07-23 (all 9 items, Phases 1–3, plus the edit-reshare unique-index bug discovered during implementation planning) — branch `feature/team-sharing-linking`, shipped with 2.13.0. See the CLAUDE.md "Team Sharing Linking Overhaul" bullet for what landed.
**Trigger:** Real-world failure. Mateusz's colleague installed Opus and created an account. Mateusz then added the colleague's email to his existing saved team contact, tagged him on a case, and saved. The case was never shared.

---

## 1. Root cause (verified in code, file:line cited)

The share never happened because **the contact was never linked** (`linkedUserId` stayed `null`), and every mechanism that could have linked it either doesn't exist, didn't fire, or requires manual steps that never happened:

1. **Adding an email to a contact is inert.** `AddEditTeamContactScreen.handleSave` (client/screens/AddEditTeamContactScreen.tsx:98-142) builds a plain data object and PUTs it. No user lookup, no linking attempt, no invitation. The server handler (server/routes.ts:2249-2302) normalizes the email and refreshes `displayName` — nothing else.
2. **The only writer of `linkedUserId` is a manual tap.** `storage.linkTeamContact` (server/storage.ts:923) is reachable only via `PUT /api/team-contacts/:id/link`, called only from `TeamContactsScreen.handleLinkContact` (client/screens/TeamContactsScreen.tsx:71-80). That button only renders when the background discovery job has already cached a match for that contact.
3. **Discovery is boot-only, 24h-throttled, and never auto-links.** Sole call site: `AuthContext.refreshUser` → `void discoverUnlinkedContacts()` (client/contexts/AuthContext.tsx:233). The 24h throttle (client/lib/discoveryService.ts:34,50-53) is checked before anything else and is **not reset when a contact is edited** — so adding the email today typically does nothing until tomorrow's app launch, and even then it only caches a *suggestion* for the manual Link button.
4. **Signup email matching doesn't link either.** Email signup calls `storage.matchInvitationsByEmail` (server/routes.ts:526-531), which sets `invitationAcceptedAt` only — never `linkedUserId` (server/storage.ts:1010-1022). It also runs *at the colleague's signup moment*; in this scenario the email was added to the contact *after* signup, so no row matched. (Side gap: the Apple new-user path never calls it at all — server/routes.ts:717-770.)
5. **Tagging snapshots the stale null.** `TOGGLE_OPERATIVE_TEAM` copies `contact.linkedUserId ?? null` at tag time (client/hooks/useCaseForm.ts:1187-1213; "Snapshot of linked_user_id at save time" — client/types/teamContacts.ts:63-64). The share bridge then filters `operativeTeam.filter(m => m.linkedUserId)` (useCaseForm.ts:2548-2557) → `shareableMembers` empty → `shareCase` never called (guard at :2657).

The app DID tell the user: the post-save alert "Case saved — team features limited … 1 tagged member isn't linked to an Opus account yet, so they won't receive this case" fired (useCaseForm.ts:2733-2760). But it is informational only — it names the problem without offering any way to fix it.

### Compounding defects (each independently keeps the case unshared *forever*)

- **Stale snapshot on edit.** Even after the contact is eventually linked, editing and re-saving the case still shares nothing: edit mode rehydrates `operativeTeam` from the stored snapshot verbatim (useCaseForm.ts:745) and nothing re-reads the contact's current `linkedUserId`. Only manually un-toggling and re-toggling the member chip re-snapshots. This is arguably a straight bug, not just UX.
- **No retroactive share path.** `shareCase` has exactly one caller — the save pipeline (useCaseForm.ts:2691). Linking a contact (TeamContactsScreen.tsx:70-89) does not offer to share previously saved cases, and CaseDetailScreen has no share/re-share affordance at all.
- **No link-state visibility while tagging.** TeamSection chips render name + role only (client/components/case-form/TeamSection.tsx:205-215) — no "on Opus" indicator, no inline link/invite. The user has no signal at tag time that sharing won't happen.
- **Zero-device-keys recipients are silently dropped.** If a linked user has no registered keys (device-key registration at signup/login/boot is best-effort try/catch — AuthContext.tsx:174-176, 222, 314, 339, 374), the bridge skips them without naming why (useCaseForm.ts:2560, 2586-2588). Not the cause here, but the next silent failure in line once linking works.
- **Discovery stamps `lastRun` even when it finds nothing to do** (discoveryService.ts:64,81), so a contact edited five minutes after a boot-time run waits a full day.

### Immediate workaround (current app, no code changes)

1. Relaunch the app ≥24h after the last launch (lets discovery re-run and cache the match), then Settings → Team Contacts → banner "1 colleague found on Opus" → **Link**.
2. Open the affected case → Edit → in Team, un-toggle and re-toggle the colleague's chip (this re-snapshots the now-populated `linkedUserId`) → Save. The share bridge will now wrap the case key to his devices and the case appears in his Shared inbox.

---

## 2. Improvement plan

Design principle: **linking should happen at the moments the user expresses intent** (typing a colleague's email into a contact; tagging them on a case), and **sharing should catch up when linking happens late**. No silent auto-sharing beyond what the user already expressed by tagging.

### Phase 1 — Kill the acute failure (small, high value)

**1A. Link-on-contact-save.**
In `AddEditTeamContactScreen.handleSave`, when the saved contact has an email and no `linkedUserId`, call the existing `searchUserByEmail` (client/lib/sharingApi.ts:26, discoverable-gated + rate-limited server-side). On a hit, prompt: *"<Name> is on Opus. Link this contact so cases can be shared with them?"* → `linkContact`. On decline, do nothing (re-offer only when the email changes). One network call per contact save; no new endpoints.
*Size: S. Files: AddEditTeamContactScreen.tsx (+ maybe a small helper in teamContactsApi.ts).*

**1B. Re-hydrate `linkedUserId` snapshots at save time (bug fix).**
In `handleSave`, before assembling `shareableMembers`, refresh each `operativeTeam` member's `linkedUserId` from the current team-contacts list (by `contactId`). Fixes "edit + re-save after linking still doesn't share" and makes 1A/2A retroactively effective for drafts and edits. Keep the stored snapshot semantics for display; only the share decision uses fresh data.
*Size: S. Files: useCaseForm.ts (+ tests around the bridge).*

**1C. Save-time rescue prompt (replaces the dead-end alert bullet).**
When the post-save check finds tagged-but-unlinked members, look up their contact emails locally and run `searchUserByEmail` for each (bounded, non-blocking). For hits, upgrade the informational alert to an actionable one: *"<Name> is on Opus — link and share this case now?"* → link → share (reusing the same wrap+TOFU path). For misses, keep the current wording and offer the existing Invite email.
*Size: M. Files: useCaseForm.ts (share bridge section), teamContactsApi.ts.*

### Phase 2 — Retroactive sharing when a link arrives late

**2A. Extract the share pipeline out of `useCaseForm.handleSave`** into `client/lib/caseSharing.ts` (`shareCaseWithMembers(caseData, members)` — the key-wrap + TOFU-verify + `shareCase` POST loop, ~150 lines currently inline at useCaseForm.ts:2523-2695). Pure refactor, no behaviour change; unlocks 2B and future CaseDetail sharing.
*Size: M (mostly test plumbing).*

**2B. "Share earlier cases?" on link.**
After any successful `linkContact` (TeamContactsScreen, 1A, 1C), scan local cases whose `operativeTeam` contains that `contactId` with a null snapshot. Offer once: *"Share N earlier cases that tagged <Name>?"* → for each: update the stored snapshot + run `shareCaseWithMembers`. Cap at the most recent ~20; report failures per case. This honours intent the user already expressed by tagging — it is not new disclosure.
*Size: M. Files: caseSharing.ts, TeamContactsScreen.tsx, caseStorage helpers.*

### Phase 3 — Visibility + upstream matching

**3A. Link-state on TeamSection chips.** Small dot/icon per chip ("on Opus" vs not) + a footer line: *"2 of 3 tagged members will receive this case."* Tapping an unlinked chip's indicator offers Link-now (search) / Invite. *Size: S-M.*
**3B. Discovery hygiene.** Reset the 24h throttle whenever a contact is created/edited with a new email/phone (`markDiscoveryStale()`); also run discovery on TeamContactsScreen focus instead of only reading yesterday's cache; don't stamp `lastRun` when there were zero unlinked contacts with identifiers. *Size: S.*
**3C. Server-side signup matching parity.** Add the missing `matchInvitationsByEmail` call to the Apple new-user path. Optionally extend signup to also flag (not hard-link) existing `team_contacts` rows matching the new user's email so owners get a discovery match immediately on their next boot — gated on the new user's `discoverable` flag, mirroring `/api/users/discover` semantics. *Size: S server-side.*
**3D. Name the zero-device-keys case.** When a linked recipient has no registered device keys at share time, say so in the post-save alert ("<Name> hasn't opened Opus on a device yet — they'll need to sign in once before cases can be shared"). *Size: S.*

### Explicitly out of scope

- Auto-sharing cases the user never tagged, or sharing without the existing per-case tag intent.
- Bypassing TOFU: all new paths go through `verifyAndPinRecipientKeys` exactly as the save bridge does today.
- Auto-linking from bulk discovery without user confirmation (only the *user-typed exact email* paths in 1A/1C auto-prompt, and they still require one confirmation tap).

### Suggested order & test focus

1B (bug fix) → 1A → 1C → 3B → 2A → 2B → 3A → 3C → 3D.
Tests: bridge re-hydration unit tests (stale snapshot → fresh link → share fires); link-prompt flows mocked at the API layer; retro-share selection logic (which cases qualify, snapshot update); discovery throttle-reset unit tests. The E2EE wrap path itself is already covered — reuse its tests after the 2A extraction.

---

## 3. Verification sources

Analysis produced from a full code trace on 2026-07-23 (branch `main`, clean tree). Key citations: AddEditTeamContactScreen.tsx:84,98-142,458-509; discoveryService.ts:34,47-53,59-64,80-81,107-108,168-184; teamContactsApi.ts:74-112,140-196,201-211; TeamContactsScreen.tsx:47-89,161-177,239-276; AuthContext.tsx:174-176,222-233,265,314,339,374; useCaseForm.ts:745,1187-1213,2481-2760; types/teamContacts.ts:60-74; sharingApi.ts:26-54; TeamSection.tsx:205-215,304-320; server/routes.ts:489-533,592-780,1389-1420,2249-2374,2406-2497,2500-2682; server/storage.ts:440-458,923-958,999-1022.
