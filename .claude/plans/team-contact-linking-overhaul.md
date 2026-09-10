# Team Contact Linking Overhaul (2.26.0)

## Context

Linking a roster contact (`team_contacts`) to a real Opus account is what makes E2EE case sharing and EPA assessments work. On-device use showed it failing. A full audit (client + server + schema, all findings verified in source) found the pipeline only ever worked by email, and even that path has holes:

- **Phone matching is dead end to end.** `profiles.phone` is never writable (`profileUpdateSchema` omits it; no Edit Profile field; `UserProfile` type lacks it), so PSI / `/discover` / `/search` by phone can never match anyone. Settings still promises "find you by email or phone". Comparison is raw string equality with no E.164 normalisation, and trim is applied asymmetrically between PSI and `/discover`.
- **Registration matching is stubbed** in both `GET /api/users/search` and `POST /api/users/discover` ("full JSONB search deferred"); the contact form has no registration inputs; registration-only contacts burn the 24h discovery throttle for a no-op round.
- **Link endpoint trusts any `linkedUserId`**: no self-link guard, no duplicate-link guard, no check that the target matches the contact's identifiers (also a careerStage disclosure primitive). Two of four client link paths skip the self-check. Discovery `Link` taps commit with no confirmation.
- **No lock / unlink.** Editing a linked contact's email leaves `linkedUserId` pointing at the old account, so future E2EE shares go to the wrong person. `unlinkContact` exists with zero callers.
- **Invitation matching bypasses Discoverable** and stamps every roster row with that email, invited or not.
- Smaller: `/discover` gives 50× the enumeration throughput its own comment claims to prevent; `/api/users/:id/keys` has no limiter; PSI response leaks the exact discoverable-user count and includes Apple relay placeholders; `getRegistrationJurisdictionForCountry` is missing `switzerland`; stale discovery banner after Link & Share; Settings country labels lack DE/CH.

**Approved decisions (Mateusz, 2026-09-11):** phone via `libphonenumber-js` (E.164, region from `countryOfPractice`); implement registration matching; linked contacts have identifiers **read-only** with an Unlink button; link is **server-verified**.

Standing principle kept from 2.13.0: discovery surfaces matches, the user confirms with a tap. No bulk auto-link.

Branch `feature/team-contact-linking-overhaul`, five gated commits (gate = `check:types` + `test:coverage` + `lint` + `check:format`). Server + migration change → Railway redeploy at release (deploy itself is out of scope).

---

## Commit 1 — Shared normalisers, schema, migration

**Dependency:** `libphonenumber-js` in `dependencies` (not dev). `scripts/server-build.js` externalises every entry in `dependencies`, so Railway resolves it at runtime; Metro bundles it for the client. Import from `libphonenumber-js/min`.

**New `shared/phone.ts`**
- `PhoneRegion = "NZ"|"AU"|"GB"|"US"|"PL"|"DE"|"CH"|"CA"|"AT"`; `COUNTRY_OF_PRACTICE_TO_PHONE_REGION`; `getDefaultPhoneRegion(countryOfPractice)`.
- `normalizePhoneE164(raw, region?) → string | null` (`parsePhoneNumberFromString`, return `.number` only when `isValid()`; blank → null).
- `E164_RE = /^\+[1-9]\d{1,14}$/`, `isE164()`, `formatPhoneForDisplay(e164)`.

**Extend `shared/professionalRegistrations.ts`**
- `normalizeRegistrationNumber(value)` → uppercase alphanumerics or null.
- `buildRegistrationLookupKey(jurisdiction, number)` → `reg:<jurisdiction>:<NORM>` (valid jurisdiction + non-empty only).
- `buildRegistrationLookupKeys(registrations, legacyMedicalCouncilNumber?, countryOfPractice?)` — reuse `getProfessionalRegistrationEntries()` so the legacy fallback is covered.
- `isProfessionalRegistrationJurisdiction()` guard + `PROFESSIONAL_REGISTRATION_JURISDICTIONS` tuple for `z.enum`.
- Fix: add `case "switzerland"` to `getRegistrationJurisdictionForCountry`.

**`shared/schema.ts`** (helpers `check`, partial `uniqueIndex().where()` already used at :38-40, :395)
- `profiles`: `registrationLookupKeys text[] NOT NULL DEFAULT '{}'` (denormalised — a set-returning JSONB lookup can't be indexed; the array is the materialised expression index and doubles as the PSI member-set source), GIN index on it, partial index on `phone`, CHECK `phone IS NULL OR phone ~ E.164`.
- `teamContacts`: partial UNIQUE `(owner_user_id, linked_user_id) WHERE linked_user_id IS NOT NULL`; CHECK `linked_user_id <> owner_user_id`; CHECK registration number/jurisdiction both-or-neither. No CHECK on `team_contacts.phone` (legacy free text; server enforces E.164 on write).

**`migrations/20260911_team_linking_identifiers.sql`** (20260425 style: single transaction, idempotent, pre-flight RAISEs)
1. Add `registration_lookup_keys` + backfill from JSONB via `jsonb_each_text` with `upper(regexp_replace(v,'[^A-Za-z0-9]','','g'))` (must equal the JS normaliser), then legacy `medical_council_number` fallback keyed by `country_of_practice` CASE (→ `other`); GIN index.
2. `profiles.phone`: light cleanup (strip `[\s().-]`, `00`→`+`), pre-flight RAISE on any leftover non-E.164 (column is unwritten today, so empty in prod), then CHECK + partial index.
3. `team_contacts.phone`: same light cleanup only; national-format leftovers re-normalise on the next client save (phone never matched before, nothing regresses).
4. Registration pair backfill (number without jurisdiction → `other`; jurisdiction without number → NULL), then CHECK.
5. Null out self-links (always wrong), then CHECK.
6. Duplicate-link pre-flight RAISE with group count + commented resolution SQL (keep newest `link_confirmed_at`), then partial UNIQUE index.

**Tests** (shared tests live in `server/__tests__/`, precedent `careerStages.test.ts`): `phone.test.ts` (NZ/AU/GB/PL national → E.164, passthrough, invalid/blank → null, no-region national → null, `isE164`), `professionalRegistrations.test.ts` (normalise, key format, invalid jurisdiction, legacy fallback key, switzerland).

**Recheck recipe:** apply SQL to local DB, scratch `drizzle-kit push` from schema.ts, diff columns + indexes + constraints → must be empty. Never push against prod.

---

## Commit 2 — Server pure logic (no route behaviour change yet)

**New `server/validation/teamContacts.ts`** — move `teamContactCreate/Update/Link`, `discoverContacts`, `discoverPsi`, `invitation` schemas out of `routes.ts` (:264-310, :400) so tests import the real thing (delete the local re-declarations in `server/__tests__/teamContacts.test.ts` + `invitations.test.ts`). Changes: `registrationJurisdiction: z.enum(...)` + both-or-neither refine; `phone: z.string().max(32)` raw (normalised in handler where region is known); new `userSearchQuerySchema` (exactly one mode); `LINK_ERROR_CODES = SELF_LINK | DUPLICATE_LINK | NO_IDENTIFIER_MATCH | CONTACT_ALREADY_LINKED | LINKED_IDENTIFIERS_LOCKED | INVITE_COOLDOWN`.

**New `server/linkResolution.ts`** (pure, injected deps so it's testable without Postgres — `server/__tests__` has no DB-backed tests)
- `LinkResolverDeps { getUser, getProfile, getUserByEmail, getUserByPhone, getUserByRegistrationKey, findContactLinkedTo }`.
- `isDiscoverable(profile) = profile?.discoverable !== false` — replaces the four `profile && profile.discoverable === false` gates (schema default is true, so profile-less users keep today's behaviour, just consistently).
- `resolveLinkCandidates(deps, contact)` — email → phone → registration, deduped, discoverable-filtered.
- `verifyLinkRequest(deps, { ownerUserId, contact, requestedUserId }) → LinkVerdict` in order: 403 `SELF_LINK`; 200 idempotent if already linked to the same user; 409 `CONTACT_ALREADY_LINKED`; 404 target missing/not discoverable; 409 `NO_IDENTIFIER_MATCH`; 409 `DUPLICATE_LINK` with `{ conflictingContactId, conflictingDisplayName }`.
- `lockedIdentifierChanges(existing, patch, region?)` → which of email/phone/registration actually change (normalised-equal = unchanged).

**New `server/discoverableIdentifiers.ts`** (pure): `buildDiscoverableIdentifiers(rows)` — skip opt-outs, skip `isSyntheticAppleEmail`, phones only if `isE164`, add `reg:` keys; `padMemberSet(members, 32)` appends random 64-hex dummies so `members.length` no longer reveals the exact user count.

**`server/rateLimit.ts`**: `createIdentifierBudget({ windowMs, budget, weigh })` — ~25-line per-user fixed-window Map (express-rate-limit has no per-request weight); export `discoverIdentifierBudget` (100 identifiers / 10 min, weighs `contacts.length`) and `userKeysRateLimiter` (60/min).

**Tests:** `linkResolution.test.ts` (candidate order/dedupe, discoverable filter, self 403, idempotent relink, linked-elsewhere 409, no-match 409, duplicate 409 carries name, `lockedIdentifierChanges` normalised-equal cases), `discoverableIdentifiers.test.ts`, `rateLimit.test.ts` (3×40 → third 429; window reset), schema tests now importing real schemas (+ enum + both-or-neither cases).

---

## Commit 3 — Server routes + storage

**`server/storage.ts`**
- `getUserByRegistrationKey(key)` (`registration_lookup_keys @> ARRAY[key]`), `findContactLinkedTo(ownerUserId, linkedUserId)`.
- `createProfile` / `updateProfile`: when `professionalRegistrations`, `medicalCouncilNumber` or `countryOfPractice` change, recompute `registrationLookupKeys` via `buildRegistrationLookupKeys`.
- `getDiscoverableIdentifiers()` selects `registrationLookupKeys` and delegates to `buildDiscoverableIdentifiers`.
- `matchInvitationsByEmail`: add `isNotNull(invitationSentAt)` — only rows the owner actually invited get stamped.
- `linkTeamContact` unchanged (careerStage COALESCE stays — needed for EPA, now only reachable for a verified, discoverable colleague). Handler maps unique-violation `23505` → 409 `DUPLICATE_LINK` (race guard).

**`server/routes.ts`**
- `profileUpdateSchema` picks `phone`; handler normalises with `getDefaultPhoneRegion(body.countryOfPractice ?? existing.countryOfPractice)`; non-empty unparseable → 400.
- `POST/PUT /api/team-contacts`: normalise phone with owner's region (400 if invalid); registration stored as typed (trimmed). PUT always loads `existing`; on a linked contact `lockedIdentifierChanges` non-empty → 409 `LINKED_IDENTIFIERS_LOCKED` ("Unlink <name> before changing their email, phone or registration.").
- `PUT /:id/link` → `verifyLinkRequest(storage, …)`; response `TeamContactRow & { linkedDisplayName }`. `GET /:id` and `PUT /:id` also append `linkedDisplayName` (single-row endpoints only; list shape unchanged).
- `GET /api/users/search`: `userSearchQuerySchema`; phone → E.164 (requester region) → `getUserByPhone`; registration → lookup key → `getUserByRegistrationKey`. Response unchanged.
- `POST /api/users/discover`: stack `discoverIdentifierBudget`; normalise phones; registration via key; skip `user.id === req.userId`.
- `POST /api/users/discover-psi`: `padMemberSet`.
- `GET /api/users/:id/keys`: mount `userKeysRateLimiter`.
- `POST /api/invitations`: 409 if contact linked; 429 `INVITE_COOLDOWN` if `invitationSentAt` < 24h (server twin of the client cooldown).
- Replace the four discoverable gates with `!isDiscoverable(profile)`.

**Link API contract** — request `{ linkedUserId }` unchanged. 200 (idempotent same-user) · 400 · 403 `SELF_LINK` · 404 contact / target missing or not discoverable · 409 `CONTACT_ALREADY_LINKED` / `NO_IDENTIFIER_MATCH` / `DUPLICATE_LINK` (+ `conflictingContactId`, `conflictingDisplayName`). Body always `{ error, code? }`. `unlink` unchanged.

**Compat:** old clients still link when identifiers match; a stale match yields a 409 whose `error` text the existing generic alert shows. Old clients' trim-only PSI phones won't match E.164 members until updated (phone never matched before).

**Tests:** supertest 401 smokes for `/link`, `/unlink`, `/search`, `/discover`, `/keys` (pattern in `server/__tests__/psiDiscovery.test.ts`).

---

## Commit 4 — Client libraries

- `client/lib/psiDiscovery.ts`: `normalizeDiscoveryPhone(phone, region?)` → `normalizePhoneE164`; update the trim-only pin at `psiDiscovery.test.ts:114`.
- `client/lib/discoveryService.ts`: `discoverUnlinkedContacts({ phoneRegion })`; exported pure `buildContactIdentifiers(contact, region)` (email lowercase, phone E.164 or skipped, `reg:` key) feeding BOTH `psiPreFilter` and the `/discover` input (ends the trim asymmetry); zero identifiers → return without stamping `lastRun`; `removeDiscoveryMatch` gets try/catch. Callers pass region: `AuthContext.tsx:229`, `TeamContactsScreen.tsx:143`.
- `client/lib/sharingApi.ts`: `searchUserByPhone`, `searchUserByRegistration`, `searchUserForContact(contact, region)` (email → phone → registration, first hit).
- `client/lib/teamContactsApi.ts`: `LinkContactError` (code + conflict fields) thrown by `linkContact` and `updateTeamContact`; `TeamContact.linkedDisplayName?`, `UserProfile.phone?`.
- `client/lib/linkingPrompts.ts`: `promptLinkContactByEmail` → `promptLinkContact(contact, ownUserId, region?)` via `searchUserForContact`; new `linkContactWithFeedback(contact, user, ownUserId)` — self-guard alert, link, code → named alerts (DUPLICATE_LINK names the other contact), `removeDiscoveryMatch`, retro-share offer — used by all screen link paths; `runPostSaveTeamPrompt` filters by `hasLinkIdentifier(m)` not `m.email`.
- `client/lib/caseSharing.ts`: `UnlinkedTaggedMember` carries phone/registration; `searchUnlinkedMembersOnOpus` uses `searchUserForContact`; `linkAndShareCaseWithHit` calls `removeDiscoveryMatch` (stale banner fix).

**Tests:** extend `discoveryService.test.ts` (reg-only contact yields identifier, no throttle burn, E.164 in both inputs, `removeDiscoveryMatch` never throws), `linkingPrompts.test.ts` (search fall-through, DUPLICATE_LINK alert, self short-circuit), `caseSharing.test.ts` (rescue link clears match; phone-only member searched), new `teamContactsApi.test.ts` + sharingApi search tests (mock `fetch`).

---

## Commit 5 — Screens, version, docs

**`client/screens/AddEditTeamContactScreen.tsx`**
- Linked card (inline, no new component): "Linked to {linkedDisplayName}", subtitle explaining locked identifiers, **Unlink** (theme.error) → confirm alert ("They'll stop receiving cases you tag them on from your next save. Already-shared cases stay shared.") → `unlinkContact` → clear local link state. `rehydrateTeamSnapshots` propagates null on the next edit-save, which drives the existing revoke diff.
- While linked: email/phone/registration inputs `editable={false}`, tertiary text, lock icon, "Unlink to change"; `handleSave` omits identifiers from the PUT. Name/role/stage/facilities/notes stay editable.
- Registration: jurisdiction chip row from `PROFESSIONAL_REGISTRATION_OPTIONS` (`teamContact.chip-jurisdiction-<id>`) + number input (`autoCapitalize="characters"`, `autoCorrect={false}`, `teamContact.input-registration`); typing a number pre-selects `getRegistrationJurisdictionForCountry(profile.countryOfPractice) ?? "other"`; both-or-neither on save.
- Phone: `normalizePhoneE164` before save; invalid → "Check phone number — include the country code, e.g. +64 21 123 4567" and abort.
- `setSaving(false)` before the link prompt (spinner no longer sits behind alerts); identifier-change detection includes the registration key and also calls `removeDiscoveryMatch(contact.id)` (a cached match is void once identifiers change); `promptLinkContact` fires when any identifier is new/changed.
- Invite button handles 429 `INVITE_COOLDOWN`.
- Pure helpers extracted for tests: `buildContactSavePayload(state, { linked, region })`, `contactIdentifierChanged(initial, saved)` → `client/lib/teamContactForm.ts` + tests.

**`client/screens/TeamContactsScreen.tsx`**: both Link handlers → confirm alert ("Link <contact> to <match name>?") then `linkContactWithFeedback` with `profile?.userId`; hide matches whose `userId` is already linked to another contact; no `setLoading(true)` flash when contacts are already loaded; reload after discovery whenever the match set changed, not only `found > 0`.

**`client/screens/EditProfileScreen.tsx`**: phone field (`settings.profile.input-phone`), normalised on save with the profile's region, same invalid alert; registration inputs get `autoCapitalize="characters" autoCorrect={false}`.

**`client/screens/SettingsScreen.tsx`**: Discoverable copy → "by email, phone or registration number"; add `germany` + `switzerland` labels.

**Version + docs:** `app.json` → 2.26.0; CLAUDE.md release bullet + Version line + "Team sharing" section notes (server-verified link, E.164 / `reg:` keys, lock semantics, migration + Railway deploy pending); `docs/EPA-ARCHITECTURE.md:72-75` note the owner/linked unique index; copy this plan to `.claude/plans/team-contact-linking-overhaul.md`.

---

## Verification

1. **CI gate on every commit**: `npm run check:types && npm run test:coverage && npm run lint && npm run check:format` (expect roughly +60 tests, coverage up).
2. **Migration**: apply to the local DB via psql, then scratch `drizzle-kit push` + diff (columns/indexes/constraints) → empty.
3. **Two-account sim E2E** (iPhone 17, local API on 5001, owner m.gladysz ↔ colleague mateo.gladysz — recipe in memory):
   - mateo: Edit Profile → phone `021 555 0100` + NZ registration `12 345-ab` → DB shows `+64215550100` and `{reg:new_zealand:12345AB}`.
   - owner: phone-only contact `021 555 0100` → Save → "Mateo Test is on Opus" → Link → reopen: Linked card, locked identifiers → Unlink → editable.
   - registration-only contact links via registration.
   - second contact with mateo's email → discovery Link → 409 alert naming the first contact; unlink first → second links.
   - self: contact with own email → no prompt; curl link with own id → 403 `SELF_LINK`.
   - curl PUT email on a linked contact → 409 `LINKED_IDENTIFIERS_LOCKED`.
   - mateo Discoverable off → search 404, link 404, discovery empty, signup-match does not stamp.
   - regression: tag linked contact → save → in mateo's inbox; unlink → edit-save → share revoked.
   - limits: 11× search/min → 429; discover 3×40 → 429; keys 61/min → 429.

## Out of scope
- Bulk auto-link without a confirmation tap; contact-merge UI for duplicates (409 + Unlink is the path).
- Ownership verification of phone/registration (SMS OTP, registry lookups) — matching stays self-declared.
- `linkedDisplayName` on the list endpoint; SQL-side national-format phone backfill (optional tsx script only).
- Drizzle numbered-baseline cutover; TeamSection footer change (resolved by the unique index); recipient-side screens; the Railway deploy and TestFlight build themselves.
