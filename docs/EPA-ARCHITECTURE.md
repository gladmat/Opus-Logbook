# EPA Architecture — Bidirectional Double-Blind Operative Entrustment

**Document contract:** Architecture blueprint for the EPA system. Sections 1–2 are durable design principles. Sections 3–5 describe the **live implementation, verified against the codebase on 2026-07-24** — every claim in those sections carries a source reference; if a reference and the live code ever disagree, the live code wins (conflict-resolution hierarchy, INSTRUCTIONS v3 §2). Section 6 lists verified gaps between design intent and implementation; Section 7 is the target architecture to close them. When Section 7 ships, fold its content into Sections 3–5 and move the superseded material to `docs/archive/`. *Amended 2026-07-24, review round 1: pairKey salting, version-coexistence gating, Phase D reframe, regulatory intake items (§§7–8); all new code-derived claims added to the §9 appendix.*

---

## 1. Concept

Opus's strategic differentiator is a **bidirectional double-blind operative entrustment (EPA) system** layered on E2EE team case sharing:

- **Top-down:** the supervisor rates the trainee's operative performance on a 5-level entrustment scale.
- **Bottom-up:** the trainee rates the supervisor's teaching quality on a 5-level scale, plus a self-entrustment rating that enables calibration analysis.
- **Double-blind:** neither party sees the other's rating until both have committed. Enforced cryptographically (commit-reveal + E2EE), not by UI politeness.
- **The procedure IS the activity:** the SNOMED CT procedure code is the EPA identifier. There is no separate EPA catalog to author, license, or maintain — every one of the app's procedures is automatically an assessable activity, and learning curves group by SNOMED code.
- **Seniority, not scrub role, defines the teaching axis.** Operative role and supervision hierarchy are fully independent dimensions: a consultant scrubbing as First Assistant is still the supervisor.
- **Adjacent links only:** assessments follow adjacent links in the seniority chain (each pair = one teacher + one learner), mapped through the universal 6-tier career-stage model. A consultant (tier 5) does not formally assess an intern (tier 1) on the same case; the chain decomposes into adjacent teacher–learner pairs.

**Academic framing (durable):** the "scarce resource" thesis — 1–2 trainees learn from an operation versus ~30 from a ward round — is the central argument of the EPA papers. The double-blind mechanism is what makes the collected ratings publishable: it removes the social-desirability contamination that plagues conventional workplace-based assessment, and the commit-reveal protocol makes that removal *auditable*. SNOMED CT as EPA identifier is presented as pragmatic engineering, not educational innovation.

## 2. Design principles

1. **Server-blind for content.** The relay server never sees assessment plaintext. Ratings and narratives travel only as E2EE ciphertext; the server stores ciphertext, key envelopes it cannot open, and a content hash (the commitment).
2. **Blindness is enforced before transport.** No assessment content — plaintext *or ciphertext* — leaves the device until both parties have committed. A hash commitment is the only thing the server holds during the blind window.
3. **Tamper-evidence over trust.** Each party can prove the other didn't change their assessment after learning theirs: the counterpart recomputes the commitment on-device after decryption.
4. **No hostage-taking.** An unresponsive counterpart cannot indefinitely block a completed assessment: a 72-hour gate unlocks a partial reveal.
5. **Reflection stays private.** The trainee's reflective notes are never shared — they are stripped from the shareable payload before hashing/encryption and exist only on the trainee's device.
6. **Snapshots over live references.** Career stage and team links are snapshotted into the case at save time; a colleague's later promotion does not rewrite the history of who supervised whom (`careerStage` is fill-gap-only on rehydration).
7. **Tier is derived, never stored.** The 6-tier mapping is a pure function of career stage, so remapping a jurisdiction's stages never requires a data migration.
8. **Analytics are on-device.** Learning curves, teaching aggregates, and calibration scores are computed from locally decrypted revealed pairs. The server cannot compute any of them.

## 3. Live data structures (verified 2026-07-24)

### 3.1 The 6-tier universal seniority model

`shared/careerStages.ts` defines `CAREER_STAGE_OPTIONS` (value, label, country, `seniorityTier`, `isConsultantLevel`) and `client/lib/seniorityTier.ts` defines the runtime map `CAREER_STAGE_TIERS` plus `getSeniorityTier()` / `isSeniorTo()`:

| Tier | Meaning | Examples (from `CAREER_STAGE_TIERS`) |
|---|---|---|
| 1 | Pre-training / Intern | `nz_pgy1`, `uk_fy1`, `de_assistenzarzt_junior`, `us_intern`, `pl_stazysta` |
| 2 | Junior Trainee | `nz_registrar_non_training`, `uk_ct`, `pl_rezydent_junior` |
| 3 | Senior Trainee | `nz_set_trainee`, `uk_st_senior`, `us_fellow`, `de_fellow` |
| 4 | Independent Specialist | `nz_fellow`, `nz_moss`, `de_facharzt`, `ch_oberarzt`, `uk_sas` |
| 5 | Senior Specialist | `nz_consultant`, `uk_consultant`, `de_oberarzt`, `us_attending` |
| 6 | Department Lead | `nz_head_of_department`, `de_chefarzt`, `pl_ordynator` |

Jurisdictions covered: NZ/AU, UK, DE, CH, PL, US, plus `other_*` generics and legacy values (`consultant_specialist`, `set_trainee`, …) for backward compatibility. Tier is resolved at runtime and never persisted (`seniorityTier.ts` header comment; no tier column exists in `shared/schema.ts`).

Note the deliberate asymmetries encoding real hierarchies: `ch_oberarzt` is tier 4 but `de_oberarzt` is tier 5; `us_fellow` is tier 3 (still in training) while `nz_fellow` is tier 4.

### 3.2 Team snapshot on the case

`CaseTeamMember` (`client/types/teamContacts.ts`) is the save-time snapshot embedded in the case and in the shared blob:

```ts
{ contactId, linkedUserId?, displayName, abbreviatedName,
  careerStage?,                      // snapshot for EPA derivation
  operativeRole,                     // "PS" | "FA" | "SS" | "US" | "SA" (case-level default)
  procedureRoleOverrides?,           // procedureIndex → role
  presentForProcedures? }            // null = all procedures
```

`rehydrateTeamSnapshots()` (`client/lib/caseSharing.ts`) refreshes `linkedUserId` from the live roster (including unlink → null) but treats `careerStage` as **fill-gap only** — a non-null historical snapshot is never overwritten, so old cases keep the stage held at case time.

The logger's own role uses the separate two-dimension system in `client/types/operativeRole.ts`: `OperativeRole` (`SURGEON`/`FIRST_ASST`/`SECOND_ASST`/`OBSERVER`/`SUPERVISOR`) × `SupervisionLevel` (`INDEPENDENT`…`DIRECTED`), with registry export mappings (RACS MALT, ISCP eLogbook, ACGME, Weiterbildung, SIWF).

### 3.3 Derivation engine

`deriveEpaAssessments()` (`client/lib/epaDerivation.ts`) turns a saved case into `EpaAssessmentTarget[]`. Verified rules:

- **Per procedure:** each procedure in the case's diagnosis groups generates its own pairs; membership respects `presentForProcedures` and `procedureRoleOverrides`.
- **Eligibility:** a participant needs *both* `linkedUserId` *and* a `careerStage` that resolves to a tier. The logger is always a participant (added with role `PS`).
- **Adjacent tiers only** — and adjacency is computed over the tiers *present in this case*, not the absolute scale: tiers present are sorted descending and pairs are generated between consecutive groups. A tier-5 consultant and tier-3 registrar alone in theatre DO pair (5 and 3 are adjacent *in that case*); add a tier-4 fellow and the chain becomes 5→4 and 4→3.
- **Equal tiers never pair** (peers don't assess each other).
- **Seniority beats scrub role:** the pair carries `supervisorOperativeRole` / `traineeOperativeRole` as metadata only; who assesses whom is decided purely by tier (file header: "A consultant (tier 5) holding a retractor as First Assistant still supervises the fellow (tier 4) who is Primary Surgeon").
- Each target carries `procedureIndex`, `procedureSnomedCode`, `procedureDisplayName` — the procedure-is-the-activity principle in code.

Invocation: `useCaseForm.ts` (save path, ~line 2602) derives targets after every save with a tagged team and a logger `careerStage`, and persists them via `saveEpaTargets(caseId, targets)` to user-scoped AsyncStorage (`@opus_epa_targets_<caseId>`).

### 3.4 Server schema (relay layer)

From `shared/schema.ts` (all verified):

- **`shared_cases`** — pairwise rows: `caseId`, `ownerUserId`, `recipientUserId`, `encryptedShareableBlob` (single E2EE blob), `blobVersion`, `recipientRole`, verification fields. `UNIQUE(caseId, recipientUserId)`; edits use revoke-then-reshare with a fresh case key (`caseSharing.ts` header).
- **`case_key_envelopes`** — per recipient *device*: wrapped case key (`envelopeJson`), cascade-deletes with the share row.
- **`case_assessments`** — the EPA channel: `sharedCaseId`, `assessorUserId`, `assessorRole` (`"supervisor"` | `"trainee"`), `encryptedAssessment` (nullable — NULL during the commit phase), `commitment` (64-char SHA-256 hex, nullable on legacy rows), `committedAt`, `submittedAt`, `revealedAt`. **`UNIQUE(sharedCaseId, assessorRole)`** — exactly one supervisor row and one trainee row per shared case.
- **`assessment_key_envelopes`** — per counterpart device, with a **`released`** boolean; envelopes are only readable once released (`server/storage.ts` `releaseAssessmentKeyEnvelopes` / `getAssessmentKeyEnvelopes(releasedOnly)`).

A fully assessed shared case therefore consists of three ciphertext blobs the server cannot open: the case blob plus two assessment blobs, each under its own symmetric key with per-device envelopes.

### 3.5 Cryptography

`client/lib/e2ee.ts`, verified: X25519 device keypair (noble, pre-clamped, stored in SecureStore `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, deliberately no cross-device migration) → ECDH shared secret → HKDF-SHA256 (context `surgical-logbook-case-key`) → XChaCha20-Poly1305 with 24-byte nonces. Payload format `case:v1:<nonce>:<cipher>`; decryption fails closed on any other format. Each share and each assessment gets a fresh random 32-byte key; keys are wrapped per recipient device. Recipient keys are TOFU-pinned (`verifyAndPinRecipientKeys`); a pin mismatch blocks both case sharing (`caseSharing.ts`) and assessment reveal upload (`assessmentReveal.ts` → `"key-mismatch"`).

### 3.6 Rating instruments

`client/types/sharing.ts`, verified:

- `EntrustmentLevel` 1–5 — labels are the classic entrustment anchors: "I had to do it" → "I did not need to be there".
- `TeachingQualityLevel` 1–5 — "Took over / minimal teaching" → "Outstanding — changed my practice".
- `SupervisorAssessment { entrustmentRating, caseComplexity? (routine|moderate|complex), narrativeFeedback? }`
- `TraineeAssessment { selfEntrustmentRating, teachingQualityRating, teachingNarrative?, reflectiveNotes? }` — `reflectiveNotes` are stripped before the shareable JSON is built (`AssessmentScreen.tsx` `handleSubmit`: "Strip reflective notes from shareable — they NEVER leave device").
- `RevealedAssessmentPair` — the on-device merged record: both entrustment ratings, teaching quality, supervisor narrative, complexity, `procedureCode` + `procedureDisplayName`, `revealedAt`.

## 4. The double-blind protocol (verified end-to-end)

Domain-separated commitment: `sha256("opus-assessment-commit-v1:<nonce>:<shareableJson>")` over the **exact serialized string** — hashing the string rather than re-serializing at verify time removes JSON canonicalization pitfalls entirely (`assessmentCommitment.ts`).

1. **Commit (phase 1).** Assessor builds the shareable JSON, generates a 24-byte nonce, and POSTs *only* the hash to `/api/assessments/commit`. Server stores it in `case_assessments` (`encryptedAssessment` NULL) after verifying the caller is a party on the shared case and hasn't already submitted. Full assessment (with reflective notes) + pending-commit state persist locally, encrypted under the user key (`assessmentStorage.ts` `PendingCommit`).
2. **Gate.** The reveal endpoint (`/api/assessments/:id/reveal`, `server/routes.ts`) refuses content upload until the counterpart has committed **or** the author's own commitment is >72h old ("an unresponsive counterpart can't hold content hostage"). The client mirrors the same gate before attempting upload (`assessmentReveal.ts`).
3. **Reveal (phase 2).** Once the gate opens, the client generates a fresh assessment key, encrypts `{v:2, shareableJson, commitmentNonce}`, wraps the key for every TOFU-verified counterpart device, and uploads. Idempotent and re-entrant from any surface — screen focus, status poll, push tap.
4. **Mutual release.** When every assessment row for the case carries content, the server sets `revealedAt` and flips `released=true` on the key envelopes; only then does `GET /api/assessments/:sharedCaseId` return the counterpart's ciphertext and envelopes. Both parties get an `assessments_revealed` push.
5. **On-device integrity verification.** The recipient decrypts, extracts the exact committed string + nonce, recomputes the hash, and compares against the commitment the server stored at phase 1. Mismatch ⇒ loud warning: "does not match the commitment they made before seeing yours" (`AssessmentRevealScreen.tsx`). The *counterpart*, not the server, is the verifier — the server can't see plaintext, which is the point.
6. **Timeout path.** With only one engaged party after 72h: a legacy content-bearing row auto-reveals server-side; a commit-only author unlocks upload via the gate and the client builds a partial pair (missing side zero-filled) for local history.
7. **Legacy path.** Older clients' instant-submit (`POST /api/assessments`, ciphertext up-front, reveal when both submitted) coexists; a legacy row counts as "committed" for the gate. Server-side party checks prevent UUID-enumeration fake assessments and one party submitting both roles.

Role determination at assessment time (`assessmentRoles.ts` `determineAssessorRole`): seniority-tier comparison from the shared blob's `operativeTeam` snapshot when both parties' stages are present; fallback to operative-role heuristics (owner with `SUP_*` supervision ⇒ supervisor; recipient logged as `SURGEON` ⇒ trainee); default owner = supervisor. UI allows override.

## 5. Analytics layer (on-device, verified)

`client/lib/assessmentAnalytics.ts`, computed from `getAllRevealedPairs()`:

- **Learning curves** per SNOMED procedure code: sequential case numbers, supervisor vs self rating per point — the procedure-is-the-activity payoff.
- **Teaching aggregate** (supervisor-facing) with a privacy threshold: returns `null` below 5 assessments *and* 3 unique shared cases ("identification-prevention threshold"). Unique-trainee count is approximated by `sharedCaseId` cardinality because `RevealedAssessmentPair` deliberately stores no counterpart userId.
- **Calibration score:** mean |supervisor − self| gap; <0.5 excellent, ≤1.0 good, else needs-attention; signed mean ±0.25 classifies over-/under-estimation. This is the publishable self-assessment-calibration metric.
- Entrustment distribution, training overview, monthly trends.

## 6. Verified gaps between design intent and implementation

These are findings from the 2026-07-24 code verification, ordered by architectural weight. The EPA *protocol* (commit-reveal, E2EE, instruments, analytics) is complete and hardened; what's missing is the *chain layer* that connects the derivation engine to the assessment channel.

1. **The derivation engine is write-only.** `deriveEpaAssessments()` runs on every save and `saveEpaTargets()` persists the targets — but `getEpaTargets()` has **no consumer anywhere in the UI** (verified by grep across `client/`). Assessments are initiated from the shared-case surfaces using `determineAssessorRole()` heuristics; the carefully derived per-procedure, per-pair targets never drive anything. The flagship algorithm currently feeds a dead-end store.
2. **Granularity mismatch: per-case channel vs per-procedure design.** `case_assessments` is keyed `UNIQUE(sharedCaseId, assessorRole)` — one supervisor + one trainee assessment per shared case — while derivation produces one target per procedure per pair. A multi-procedure case (routine in hand trauma) can carry only a single assessment pair.
3. **Procedure attribution is hardcoded to the first procedure.** `AssessmentRevealScreen.tsx` builds the revealed pair with `diagnosisGroups[0].procedures[0]` for both code and display name. For multi-procedure cases the learning-curve data point may be attributed to the wrong procedure — a data-integrity issue for the publication dataset, not just cosmetics.
4. **Chain pairs that don't include the case owner have no channel.** `shared_cases` rows are strictly owner↔recipient. If a tier-3 logger tags a tier-5 consultant and a tier-4 fellow, derivation correctly produces 5→4 — but no shared-case row exists *between the consultant and the fellow*, so that pair has nowhere to commit. Adjacent-chain assessment currently works only for pairs involving the logger.
5. **Partial (72h) reveals pollute analytics.** The partial pair zero-fills the missing side (`0 as EntrustmentLevel`) and is saved into the same store the analytics read. A supervisor-only partial injects `traineeSelfEntrustment: 0` into calibration gaps and curve points; `RevealedAssessmentPair` carries no flag distinguishing partial from full pairs.
6. **The assessor role is self-declared at commit.** The server stores whatever `assessorRole` the client sends (party membership is checked; role plausibility is not). The tier logic that *should* decide who is the teacher lives client-side in `determineAssessorRole()` + the unread EPA targets. Acceptable at current scale between colleagues who know each other; it becomes a data-quality question for the papers.
7. **`teachingNarrative` is collected but dropped at reveal.** It is part of `TraineeAssessment` and travels in the shareable JSON, but `RevealedAssessmentPair` has no field for it and the reveal screen never surfaces it to the supervisor — bottom-up narrative feedback is silently discarded on the receiving side.

## 7. Target architecture

Direction: **promote `EpaAssessmentTarget` from a derived by-product to the unit the assessment channel is keyed on.** The protocol layer (commit-reveal, envelopes, crypto) is sound and unchanged; the work is in the channel schema, target consumption, and chain completion.

### Phase A — Per-procedure assessment channel (schema + API)

- Add to `case_assessments`: `pairKey varchar(64) NOT NULL DEFAULT ''` — an opaque client-computed identifier for (procedure × supervisor × trainee). Replace `UNIQUE(sharedCaseId, assessorRole)` with `UNIQUE(sharedCaseId, pairKey, assessorRole)` (legacy rows keep `''`, preserving old uniqueness semantics without a backfill).
- `pairKey` must be **server-blind, and a bare hash of the pair tuple is not**: the server already knows both user IDs, `procedureIndex` is a small integer, and the SNOMED picklist is a finite public set — an unsalted `sha256(procedureIndex, snomedCode, supervisorUserId, traineeUserId)` is enumerable server-side in milliseconds, recovering exactly the procedure identity the design hides. The derivation therefore includes a **party-only secret salt** drawn from the case key, which both parties hold (the owner generated it; the recipient unwraps it from `case_key_envelopes`) and the server never sees:
  - `pairKeySalt = HKDF-SHA256(ikm = caseKey, salt = ∅, info = "opus-epa-pairkey-salt-v1", L = 32)` — the same HKDF shape as `deriveSharedKey()` in `client/lib/e2ee.ts` (`hkdf(sha256, ikm, undefined, utf8ToBytes(context), 32)`), with a dedicated context string following the existing `surgical-logbook-case-key` convention.
  - `pairKey = hex(sha256(utf8("opus-epa-pairkey-v1:" + hex(pairKeySalt) + ":" + procedureIndex + ":" + procedureSnomedCode + ":" + supervisorUserId + ":" + traineeUserId)))` — domain-separated, colon-joined, hashed over the exact serialized string, reusing the `assessmentCommitment.ts` pattern (`DOMAIN:nonce:json`) that avoids canonicalization pitfalls. 64 hex chars fits the `varchar(64)` column.
  - Both parties derive it independently from material they already hold — no coordination round-trip; the server enforces uniqueness and matches counterpart commits on an opaque token it cannot reverse.
- **Reshare interaction (resolved):** revoke-then-reshare rotates the case key — which rotates the salt — but this is moot, because the revocation *already destroys the channel*: `case_assessments.sharedCaseId` references `shared_cases.id` with `onDelete: cascade` (`shared/schema.ts`), so every in-flight assessment row (committed or revealed) dies with the old share row today, salted pairKey or not. The position is therefore: **a reshare invalidates in-flight pairs; parties re-commit under the new share row, new key, and new salt.** No key-version pinning is needed — it would preserve a salt for a channel that no longer exists. One client obligation follows: `PendingCommit` state is keyed by the dead `sharedCaseId` (`assessmentStorage.ts`) and must be garbage-collected when the referenced share 404s, or it lingers as an orphan.
- Carry `procedureIndex`/`procedureSnomedCode`/`procedureDisplayName` **inside** the E2EE reveal payload (extend `RevealPayloadV2` → v3) so procedure attribution comes from the committed content, not from `diagnosisGroups[0].procedures[0]` guesswork. This fixes Gap 3 as a side effect.
- Commit/reveal/status endpoints take `pairKey`; the mutual-release check ("all rows have content") scopes to the pair, not the whole case.

**Version coexistence (hard precondition of Phase A rollout).** Without a gate, the rollout window deadlocks: a new client commits under `pairKey = P` while its old-client counterpart commits under `pairKey = ''`; the pair-scoped mutual-release check never completes, both parties sit blind until the 72h gate, and every assessment in the window degrades to a partial — polluting exactly the analytics Phase C cleans. The gating mechanism reuses `blobVersion`, whose live mechanics make it free for this purpose (verified): rows are inserted with the schema default `1` — the share POST's zod schema has no `blobVersion` field — and the only writer is the owner-only `PUT /api/shared/:id/blob` with `lt(blobVersion, version)` optimistic locking, which **no client code calls**. Every production row is therefore version 1, and the field can carry a capability floor without a migration:

1. Phase A clients send `blobVersion: 2` at share time (extend the share schema to accept it, default 1). `blobVersion ≥ 2` on a row asserts the owner's client speaks per-procedure EPA and the blob carries everything the recipient needs to derive identical targets.
2. The server rejects any non-empty-`pairKey` commit on a row with `blobVersion < 2` — legacy-owner cases stay on the single-pair flow unconditionally.
3. The recipient's capability is unknowable before their first action, so two rules close the reverse race: a new client keeps **at most one pair open per counterpart** until that counterpart's first non-empty-`pairKey` commit proves capability; and the server applies a deterministic **adoption rule** — a legacy commit (`pairKey = ''`) arriving on a case whose open commitments carry exactly one distinct non-empty `pairKey` is recorded under that `pairKey`, letting the pair-scoped mutual release complete. (The legacy party's reveal payload carries no procedure attribution; attribution falls back to the v2-payload handling in Gap 3's fix.) The one-open-pair rule guarantees the adoption is never ambiguous.

When either side is below the threshold, the flow degrades to the legacy single-pair-per-case channel — never to a deadlock.

### Phase B — Consume the derived targets (client)

- On the trainee/supervisor side, read `getEpaTargets(caseId)` (owner) or re-derive from the decrypted blob's `operativeTeam` + procedures (recipient — derivation is a pure function of data already in the blob, so both sides compute identical targets without any new transport).
- Replace the `determineAssessorRole()` heuristic with target lookup wherever a target exists; keep the heuristic solely as fallback for cases with no derivable targets (unlinked members, missing stages). This closes Gaps 1 and 6 together: the role is no longer self-declared where a target dictates it.
- Surface targets as explicit prompts: post-save "2 EPA assessments available" on the owner side, per-target rows on `SharedCaseDetailScreen`, inbox badge counts. One target = one commit-reveal flow.

### Phase C — Analytics integrity

- Add `partial: boolean` (and optionally `teachingNarrative`) to `RevealedAssessmentPair`; exclude partial pairs from calibration and curve computations, or render them as gaps. Fixes Gaps 5 and 7. Local-storage-only change; old records without the flag are treated as full pairs (matching today's behaviour) unless a rating is 0, which is retro-detectable.

### Phase D — Chain completion (recipient↔recipient pairs; separable, ship last)

- **Recipient↔recipient channels require schema surgery under any option.** The live party model is strictly two-party and server-enforced (verified): `POST /api/share` sets `ownerUserId` from the authenticated caller — a third party cannot create a row between two other users without falsifying identity; each `shared_cases` row holds exactly one recipient, so one row can never carry a consultant↔fellow pair created on their behalf; every assessment endpoint authorizes through `assertIsPartyOnSharedCase(owner | recipient)`; and revoke + blob-update are owner-scoped. An owner-fabricated "assessment-only share row" between two non-owner parties would either falsify `ownerUserId` — poisoning revoke semantics, TOFU pinning expectations, and any future audit trail — or require changing the party model itself, which is most of the alternative's schema work without its cleanliness.
- Candidates, with their real costs: **(a) third-party-created share rows** — reuses the existing envelope/TOFU/commit-reveal machinery wholesale, but needs a new creation endpoint, a creator-distinct-from-parties (or two-recipient) party model, and a redefinition of revoke/ownership semantics across every surface that assumes owner = creator = party. **(b) a first-class `assessment_channels` table** decoupled from `shared_cases`, referencing a case only by an owner-scoped opaque id — clean trust topology and honest semantics, but duplicates the envelope/release/status plumbing and adds a second channel type the client must poll and reconcile. Neither is recommended here.
- **Primary conclusion: Phase D gets its own detailed blueprint before any implementation.** It is the only phase that changes the trust topology; the option choice should be made there, against the party-model constraints above, not pre-committed in this document. Until it ships, the documented limitation stands: adjacent pairs are assessable only when one member is the case logger.

Sequencing rationale: A unblocks B (targets need somewhere to commit per-procedure); C is independent and cheap — it can ship first if a publication data pull is imminent; D changes the trust topology and is blueprinted separately before implementation.

**Horizon.** The publication track will require a consented, de-identified research export of revealed assessment pairs; no phase above produces one — flagged here, undesigned, so it reaches the ethics application early.

## 8. Privacy & regulatory notes

- EPA assessments are **personal data about identifiable colleagues** (GDPR; NZ Privacy Act 2020). The E2EE design means the processor (relay server) holds only ciphertext, commitments, timestamps, and role labels — but timing metadata and the social graph (who assesses whom, how often) are visible server-side and must be covered in the privacy statement.
- The commit-reveal design is itself a privacy control: during the blind window the server holds a hash, not ciphertext — there is no window where one party's content sits server-side while the counterpart hasn't engaged (`server/routes.ts` header comment).
- Reflective notes never leave the device; the teaching aggregate's 5-assessment/3-case threshold prevents a trainee's ratings from being singled out. Both belong in the papers' ethics section as engineered safeguards.
- Assessments ride on shared cases, and shared cases include full patient identity (the privacy boundary is the server, not the care team). Therefore the German §203 StGB / Swiss Art. 321 StGB consent prerequisite for team sharing gates EPA availability in DE/CH exactly as it gates sharing itself. Whichever shape Phase D takes, a channel that carries no patient identity would weaken that coupling for recipient↔recipient pairs — a design goal for the Phase D blueprint, not a decided mechanism.
- Opus remains a documentation tool: entrustment ratings document training interactions; nothing in the EPA layer generates clinical guidance.
- **Retention & erasure (open regulatory position).** EPA records are personal data about identifiable colleagues, so account deletion needs a defined position for assessments *about* the departing user and *by* them. Server-side, the schema already answers mechanically (verified): `users` FK cascades remove every `shared_cases` row the user is party to, which cascades every `case_assessments` row on those shares — both authored by and about them — plus all key envelopes (`shared/schema.ts`, `onDelete: cascade` throughout). But that is where enforcement ends: counterparts' **local decrypted copies** — `RevealedAssessmentPair` records in their device storage (`client/lib/assessmentStorage.ts`) — survive by design and are unreachable. E2EE makes erasure propagation to counterparts' devices unenforceable, and the position statement must say so plainly rather than imply deletion reaches other people's phones. The honest framing: revealed assessments are disclosures already made to an identified colleague, like a signed paper assessment form — deletion removes the relay's ciphertext and the departing user's own copies, not the counterpart's received copy.
- **Permanence & rectification (open product decision with legal weight).** Entrustment ratings are immutable once revealed — the API surface has no edit or retraction path (verified: `server/routes.ts` exposes only commit, reveal, status, and history) — and they feed a colleague's permanent learning-curve and calibration analytics. GDPR accuracy/rectification rights, and basic fairness, require a documented position on disputes and appeals: what a trainee can do about a rating they consider wrong or hostile, and what (if anything) a rater can amend post-reveal. The commit-reveal integrity design deliberately makes silent modification impossible, which sharpens the question rather than answering it. This blueprint flags the decision; it does not resolve it.

## 9. Claim-verification appendix (2026-07-24)

| Claim | Source verified |
|---|---|
| 6-tier model, tier derived not stored | `shared/careerStages.ts`, `client/lib/seniorityTier.ts`; no tier column in `shared/schema.ts` |
| Adjacent-tier pairing, per procedure, seniority over scrub role | `client/lib/epaDerivation.ts` |
| Derivation invoked on save; targets stored | `client/hooks/useCaseForm.ts` ~2602; `assessmentStorage.ts` |
| `getEpaTargets` has no UI consumer | grep across `client/` — definition + tests only |
| One assessment pair per shared case | `shared/schema.ts` `case_assessments_case_role_idx` |
| Commit = sha256 over exact string, domain `opus-assessment-commit-v1` | `client/lib/assessmentCommitment.ts` |
| No content (even ciphertext) server-side until both commit | `server/routes.ts` assessments section header + `/commit`, `/reveal` handlers |
| 72h gates (reveal unlock + legacy auto-reveal) | `server/routes.ts` reveal gate + GET status; `assessmentReveal.ts` client mirror |
| Envelope release only at mutual reveal | `server/storage.ts` `releaseAssessmentKeyEnvelopes`, `getAssessmentKeyEnvelopes(releasedOnly)` |
| Counterpart (not server) verifies commitment on-device | `AssessmentRevealScreen.tsx`; `assessmentCommitment.ts` header |
| X25519 + HKDF-SHA256 + XChaCha20-Poly1305, fresh key per payload, per-device envelopes, TOFU pinning | `client/lib/e2ee.ts`, `caseSharing.ts`, `assessmentReveal.ts` |
| Reflective notes stripped pre-share | `AssessmentScreen.tsx` `handleSubmit` |
| Entrustment/teaching scales + labels | `client/types/sharing.ts` |
| Reveal pair uses first procedure of first diagnosis group | `AssessmentRevealScreen.tsx` (both partial and full paths) |
| Partial reveal zero-fills missing ratings | `AssessmentRevealScreen.tsx` partial-pair construction |
| Analytics thresholds (5/3, calibration 0.5/1.0, ±0.25) | `client/lib/assessmentAnalytics.ts` |
| Pairwise shares, revoke-then-reshare, fresh case key per save | `client/lib/caseSharing.ts`, `shared/schema.ts` |
| careerStage fill-gap-only rehydration | `client/lib/caseSharing.ts` `rehydrateTeamSnapshots` |

Added at review round 1 (2026-07-24):

| Claim | Source verified |
|---|---|
| HKDF convention for the pairKey salt: `hkdf(sha256, ikm, undefined, utf8ToBytes(context), 32)`, dedicated context string | `client/lib/e2ee.ts` `deriveSharedKey` + `CASE_KEY_CONTEXT` |
| Domain-separated exact-string hashing pattern reused for pairKey | `client/lib/assessmentCommitment.ts` (`DOMAIN:nonce:json`) |
| Both parties hold the case key (owner generates; recipient unwraps envelope) | `client/lib/caseSharing.ts` `encryptAndShareCase`; `client/lib/e2ee.ts` `unwrapCaseKeyEnvelope` |
| `blobVersion` inserted at schema default 1; share POST accepts no `blobVersion` | `shared/schema.ts`; `server/routes.ts` share zod schema |
| Only `blobVersion` writer is owner-only `PUT /api/shared/:id/blob` with `lt(blobVersion, version)` optimistic locking; no client consumer | `server/routes.ts` blob PUT; `server/storage.ts` `updateSharedCaseBlob`; grep across `client/lib/` |
| In-flight assessments die on revoke: `case_assessments.sharedCaseId` → `shared_cases.id` `onDelete: cascade` | `shared/schema.ts` |
| `PendingCommit` keyed by `sharedCaseId` (orphaned on reshare) | `client/lib/assessmentStorage.ts` |
| `POST /api/share` sets `ownerUserId` from the authenticated caller; one recipient per row; self-share rejected | `server/routes.ts` `/api/share` handler |
| Assessment auth strictly owner-or-recipient | `server/routes.ts` `assertIsPartyOnSharedCase` |
| Revoke and blob-update are owner-scoped | `server/storage.ts` `deleteSharedCase`, `updateSharedCaseBlob` |
| Account deletion cascades all shares the user is party to → all assessments on them, both directions | `shared/schema.ts` `users` FK cascades (`sharedCases`, `caseAssessments`, envelope tables) |
| Counterparts' local revealed pairs survive deletion (device-local, decrypted) | `client/lib/assessmentStorage.ts` `saveRevealedPair` / AsyncStorage |
| No assessment edit/retraction endpoint post-reveal | `server/routes.ts` (commit / reveal / status / history only) |
