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
- **The entrustment instrument fires only when the trainee performed (2.23.0+).** The O-SCORE/Zwisch-style anchors ("I had to do it" → "I did not need to be there") measure how much the supervisor had to help the *performing* trainee; no validated entrustment scale exists for the assisting role. So a junior paired with a senior on a unit yields an entrustment TARGET only when the junior's role on that unit is Primary Surgeon (PS); First Assistant yields an *assist* exposure record and SA/SS/US an *exposure* record — logged participation with no instrument, never entering commit-reveal and never counted as pending. The supervisor's own role is never gated. Both directions fire on the same trigger, preserving the one-supervisor-one-trainee commit-reveal pairing.
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

`deriveEpaAssessments({ self, teamMembers, units })` (`client/lib/epaDerivation.ts`, v3 as of 2.23.0) turns a saved case into `{ targets: EpaAssessmentTarget[], exposures: EpaExposureRecord[], diagnostics }`. Verified rules:

- **Per UNIT, not per case:** `buildEpaUnitsFromDiagnosisGroups()` flattens every procedure into a unit (flat index = the key space of the legacy `presentForProcedures` / `procedureRoleOverrides` maps). A procedure with `operativeSteps` yields one unit per step and the step team is AUTHORITATIVE; otherwise the whole procedure is one unit whose participants come from the flat maps plus the owner at their resolved procedure role (`ownerOperativeRoleToTeamRole(resolveOperativeRole(override, default))`).
- **Eligibility:** a participant needs *both* `linkedUserId` *and* a `careerStage` that resolves to a tier (`unlinkedSkipped` / `missingStageSkipped` diagnostics). The logger is identified by `linkedUserId` + the `"self"` contactId sentinel.
- **Most-senior pairing:** on each unit every participant is paired with the most-senior OTHER participant(s) — ties at the top tier produce one pair per senior; same-tier-only units produce nothing (`allSameTier` diagnostic); a participant never pairs with themselves (self tagged as a roster contact).
- **PS role gate (v3):** `classifyTraineeParticipation(role)` — PS → `"entrustment"` (recordPair), FA → `"assist"`, SA/SS/US → `"exposure"` (both recordExposure). Only the JUNIOR's role is gated; the supervisor's role is metadata (`supervisorRole` on the unit ref). The owner's `SECOND_ASST`/`OBSERVER` collapse to SA/US and therefore land in exposure as intended. Diagnostics: `roleGatedUnits`, `exposureOnly` (≥1 gated unit and zero targets — drives the save-time alert bullet).
- **Aggregation:** one target per supervisor–trainee USER pair per case (two roster contacts linked to one account collapse — since 2.26.0 the server also forbids it: partial UNIQUE `(owner_user_id, linked_user_id)` on `team_contacts`, so the collapse only applies to legacy rows), listing every PS unit shared (`units: EpaUnitRef[]` with `procedureId`/`procedureSnomedCode`/`procedureDisplayName`/`stepId?`/`stepLabel?`/roles); one exposure record per participant USER (`units: EpaExposureUnitRef[]` with `role` ≠ PS and `seniorDisplayNames`).
- `EpaAssessmentTarget.version: 3`. Stored v2 records (pre-gate) are **migrated on read** (`client/lib/epaTargetMigration.ts`: units filtered to PS-trainee units, empty targets dropped, written back) so old cases' CaseDetail cards don't blank until re-save; v1/plaintext still purge.

Invocation: `useCaseForm.ts` derives BEFORE sharing (so the share POST can carry the `epaEligible` hint per recipient — `pendingEpa.epaEligibleRecipientIds`), persists `saveEpaTargets(caseId, targets, exposures)` as a single v3 envelope `{ v: 3, targets, exposures }` under `@opus_epa_targets_<caseId>`, and runs on every edit-save even with an empty team so stale records clear. The recipient side runs the SAME engine over the decrypted blob (`client/lib/epaFromBlob.ts` — `deriveEpaFromSharedBlob({ blob, viewerUserId, ownerUserId, counterpartUserId? })` → `{ targets, exposures, myTarget, myRole, myExposure, reason }`); `client/lib/epaGate.ts` `resolveEpaEntryState()` turns that into the one entry state (`assess` / `exposure-only` / `legacy-fallback` / `none`) shared by SharedCaseDetail, the inbox badge and AssessmentScreen.

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

`client/types/sharing.ts`, verified (instrument v2 as of 2.23.0):

- **Top-down (supervisor) — unchanged:** `EntrustmentLevel` 1–5, the classic ad hoc entrustment–supervision anchors "I had to do it" → "I did not need to be there" (ten Cate ES scale / O-SCORE / Zwisch lineage). `SupervisorAssessment { entrustmentRating, caseComplexity? (routine|moderate|complex — the SIMPL tercile), narrativeFeedback?, procedure?, traineeOperativeRole? }`.
- **Bottom-up (trainee) — v2 redesign.** The v1 teaching global's top anchor ("Outstanding — changed my practice") was an aspirational lifetime event, not a per-case outcome, so the two 5-point scales were not parallel constructs and teaching ratings ceiling-compressed. `TraineeAssessmentV2 { instrumentVersion: 2, selfEntrustmentRating, autonomyMatch, bid, teachingQualityRating, teachingNarrative?, reflectiveNotes?, procedure?, traineeOperativeRole? }`:
  - *Self-entrustment* (kept, same anchors) — feeds the supervisor-vs-self calibration score.
  - *Part A — granted-autonomy match* `AutonomyMatchLevel` 1–5: "Held back" / "Slightly under" / "Well matched" / "Slightly over" / "Beyond me" (`AUTONOMY_MATCH_LABELS` + `_DESCRIPTIONS`). A calibration construct whose ideal is the CENTRE, so it has no ceiling asymmetry and is the true mirror of entrustment — the basis of the entrustment–autonomy-gap analytic (incl. its equity dimension).
  - *Part B — BID behaviour items* `BidBehaviours = Record<"briefing"|"intraop"|"debrief", 0|1|2>` ("Not this case" / "Somewhat" / "Yes, clearly"; prompts in `BID_ITEM_PROMPTS`) — Roberts' Briefing/Intraoperative/Debriefing frequency construct, per-case attainable.
  - *Part C — per-case global* `teachingQualityRating` 1–5 with per-case anchors Poor / Adequate / Good / Very good / Outstanding (`TEACHING_QUALITY_LABELS`; the v1 map survives as `TEACHING_QUALITY_LABELS_V1`, selected by `teachingQualityLabel(level, instrumentVersion)`). Field NAME kept so legacy readers keep working; `TraineeAssessment = TraineeAssessmentV1 | TraineeAssessmentV2`, `isTraineeAssessmentV2()`.
  - `reflectiveNotes` are still stripped before the shareable JSON is built (`AssessmentScreen.tsx` `handleSubmit`).
- **Attribution inside the committed payload:** both payloads carry `procedure: AssessmentProcedureRef { procedureSnomedCode, procedureDisplayName, procedureId? }` — the first PS unit of the derived target (`client/lib/assessmentProcedure.ts` `resolveAssessmentProcedure`) — plus `traineeOperativeRole: "PS"` when target-derived. This closes the old "first procedure of the first diagnosis group" guess without waiting for Phase A's pairKey.
- `RevealedAssessmentPair` — the on-device merged record, now built by ONE pure helper (`client/lib/revealedPair.ts` `buildRevealedPair`): both entrustment ratings, teaching global, supervisor narrative, complexity, `procedureCode` + `procedureDisplayName`, `revealedAt`, plus `partial?` (Phase C), `teachingNarrative?` (Phase C — finally shown to the supervisor), `instrumentVersion?`, `autonomyMatch?`, `bid?`, `traineeOperativeRole?`. `isFullRevealedPair()` treats legacy unflagged records as full unless a side was zero-filled.

The commitment hashes the exact serialized string, so the instrument redesign needed no change to `assessmentCommitment.ts`, the reveal payload, or the (content-blind) server.

### 3.7 What each party sees at reveal (2.25.0)

Both parties open the same `AssessmentRevealScreen`, so the screen must know which side the viewer is on. `RevealedAssessmentPair.viewerRole` (`"supervisor" | "trainee"`) is written by `buildRevealedPair` from the server-persisted `case_assessments.assessorRole` of the viewer's own row; records written before 2.25.0 are backfilled on read (`assessmentStorage.backfillViewerRole`) from the locally stored own assessment (`inferViewerRoleFromOwnAssessment` — a supervisor payload carries `entrustmentRating`, a trainee payload `selfEntrustmentRating`). Records that cannot be backfilled render with neutral labels and are excluded from role-specific analytics.

- **Supervisor view** leads with *their teaching as the trainee rated it*: autonomy match (Part A, re-voiced in the third person via `AUTONOMY_MATCH_DESCRIPTIONS_FOR_SUPERVISOR`), BID behaviours (Part B, `BID_ITEM_PROMPTS_FOR_SUPERVISOR`), the per-case global (Part C) and the trainee's narrative ("Trainee feedback on your teaching"); then the entrustment comparison with columns **You** / **Trainee (self)** and supervisor-addressed gap copy; then their own written feedback.
- **Trainee view** leads with the entrustment comparison (**Supervisor** / **You (self)**, trainee-addressed gap copy — unchanged from pre-2.25.0), then the supervisor's feedback, then a read-back of their own rating of the teaching.
- The gap sentences live in `client/lib/entrustmentGap.ts` (`getEntrustmentGapInfo(supervisor, self, audience)`), tested for both audiences. Before 2.25.0 the trainee wording was shown to everyone, so a supervisor who rated 4 against a self-rating of 3 was told "You may be underestimating yourself".
- Training analytics split by the same field (`splitPairsByViewerRole`): learning curves / calibration / autonomy gap run over pairs where the viewer was the trainee, teaching aggregate / entrustment-given over pairs where the viewer supervised. The Statistics Training tab renders whichever views have data (both for a fellow), ordered by career stage.

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

`client/lib/assessmentAnalytics.ts`, computed from `getAllRevealedPairs()` — **full pairs only** (`fullPairsOnly` / `isFullRevealedPair`; Phase C: 72h partial reveals are excluded from every analytic instead of injecting a zero-filled side). Thresholds are named constants: `SUPERVISOR_AGGREGATE_MIN_ASSESSMENTS = 5`, `SUPERVISOR_AGGREGATE_MIN_UNIQUE_CASES = 3`, `CALIBRATION_MIN_PAIRS = 3`.

- **Learning curves** per SNOMED procedure code, built from **Primary-Surgeon entrustment only** (pairs carrying a `traineeOperativeRole` other than PS — possible from an older counterpart app — are dropped; legacy records without a role are kept): sequential case numbers, supervisor vs self rating per point — the procedure-is-the-activity payoff.
- **Calibration score** (trainee-facing): mean |supervisor − self| gap; <0.5 excellent, ≤1.0 good, else needs-attention; signed mean ±0.25 classifies over-/under-estimation. The self-assessment-calibration metric.
- **Entrustment–autonomy gap** (`computeAutonomyGap(pairs, audience)`, instrument v2 only): mean(autonomyMatch − 3) signed around the centre ideal, held-back / matched / over-extended rates, distribution, `byEntrustment` (mean match per supervisor entrustment level — the per-procedure competence–autonomy gap), monthly trend; direction ±0.25. Trainee audience needs ≥3 pairs; supervisor audience ("how trainees experienced the autonomy I granted") sits behind the 5/3 identification threshold. This is the second pre-registered analytic and the one that carries the equity dimension.
- **Teaching aggregate** (supervisor-facing) behind the 5/3 threshold: mean per-case global (`legacyScaleCount` flags pairs rated on the v1 anchors — both scales are monotone 1–5 and are pooled), `behaviours` = `computeBidFrequencies` (per-item counts / clear-rate / mean over v2 pairs, same threshold), `autonomy` = the supervisor-audience gap above. Unique-trainee count is approximated by `sharedCaseId` cardinality because `RevealedAssessmentPair` deliberately stores no counterpart userId.
- **Exposure count** (`useTrainingStatistics.exposureCaseCount`): cases the viewer logged where they assisted under a tagged senior — shown as "Assisted (exposure)", never pooled with entrustment.
- Entrustment distribution, training overview, monthly trends.

## 6. Verified gaps between design intent and implementation

These are findings from the 2026-07-24 code verification, ordered by architectural weight. The EPA *protocol* (commit-reveal, E2EE, instruments, analytics) is complete and hardened; what's missing is the *chain layer* that connects the derivation engine to the assessment channel.

1. **The derivation engine is write-only.** `deriveEpaAssessments()` runs on every save and `saveEpaTargets()` persists the targets — but `getEpaTargets()` has **no consumer anywhere in the UI** (verified by grep across `client/`). Assessments are initiated from the shared-case surfaces using `determineAssessorRole()` heuristics; the carefully derived per-procedure, per-pair targets never drive anything. The flagship algorithm currently feeds a dead-end store.
2. **Granularity mismatch: per-case channel vs per-procedure design.** `case_assessments` is keyed `UNIQUE(sharedCaseId, assessorRole)` — one supervisor + one trainee assessment per shared case — while derivation produces one target per procedure per pair. A multi-procedure case (routine in hand trauma) can carry only a single assessment pair.
3. ~~**Procedure attribution is hardcoded to the first procedure.**~~ **CLOSED 2.23.0** — both committed payloads carry `procedure` (first PS unit of the derived target); `buildRevealedPair` prefers supervisor → trainee payload → fallback. (Original finding: `AssessmentRevealScreen.tsx` built the revealed pair with `diagnosisGroups[0].procedures[0]`.)
4. **Chain pairs that don't include the case owner have no channel.** `shared_cases` rows are strictly owner↔recipient. If a tier-3 logger tags a tier-5 consultant and a tier-4 fellow, derivation correctly produces 5→4 — but no shared-case row exists *between the consultant and the fellow*, so that pair has nowhere to commit. Adjacent-chain assessment currently works only for pairs involving the logger.
5. ~~**Partial (72h) reveals pollute analytics.**~~ **CLOSED 2.23.0 (Phase C)** — `RevealedAssessmentPair.partial` is set by `buildRevealedPair`; `fullPairsOnly` gates every analytic; legacy zero-filled records are retro-detected by `isFullRevealedPair`; a cached partial upgrades to full on the reveal screen once the counterpart reveals.
6. **The assessor role is self-declared at commit.** The server stores whatever `assessorRole` the client sends (party membership is checked; role plausibility is not). The tier logic that *should* decide who is the teacher lives client-side in `determineAssessorRole()` + the unread EPA targets. Acceptable at current scale between colleagues who know each other; it becomes a data-quality question for the papers.
7. ~~**`teachingNarrative` is collected but dropped at reveal.**~~ **CLOSED 2.23.0 (Phase C)** — carried on `RevealedAssessmentPair.teachingNarrative` and rendered as "Trainee feedback on teaching" on the reveal screen.

9. ~~**The reveal screen and training analytics were audience-blind.**~~ **CLOSED 2.25.0** — `viewerRole` persisted on the pair (backfilled for older records), audience-aware reveal copy and card order (§3.7), analytics split by side. (Original finding: `getGapInfo` rendered trainee second-person copy to the supervisor; `useTrainingStatistics` pooled supervised and supervising pairs and switched views on a profile flag.)

8. **Version skew across the role gate (transitional, 2.23.0).** An older counterpart app still derives pre-gate (e.g. FA-trainee) pairs and may commit under one. The new side shows the exposure-only notice unless the counterpart has already committed (`resolveEpaEntryState` rescue → "assess"), and any such revealed pair carries a non-PS `traineeOperativeRole` so learning curves exclude it. Not solved — resolves as clients update.

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

### Phase C — Analytics integrity — **SHIPPED 2.23.0**

- `partial: boolean` + `teachingNarrative` on `RevealedAssessmentPair` (`client/lib/revealedPair.ts`); every analytic runs over `fullPairsOnly`; legacy unflagged records are full unless a rating is 0 (retro-detected). Gaps 5 and 7 closed. Shipped together with the PS role gate and trainee instrument v2 (§§1, 3.3, 3.6, 5) and with attribution-in-payload (Gap 3) — delivered without Phase A's pairKey, which remains the route to per-procedure channels.

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

Added 2026-08-23 (2.23.0 — PS role gate + instrument v2 + Phase C):

| Claim | Source verified |
|---|---|
| Pairing per unit, most-senior rule, PS role gate, exposure records, `version: 3`, diagnostics `roleGatedUnits`/`exposureOnly` | `client/lib/epaDerivation.ts` (`classifyTraineeParticipation`, `pairUnit`); `client/lib/__tests__/epaDerivation.test.ts` |
| Owner/recipient identity covers targets AND exposures; `counterpartUserId` preference | `client/lib/epaFromBlob.ts`; `epaFromBlob.test.ts` |
| v2 → v3 migrate-on-read, single v3 envelope `{v, targets, exposures}` | `client/lib/epaTargetMigration.ts`; `client/lib/assessmentStorage.ts` (`getEpaTargetsRecord`); `assessmentStorage.test.ts` |
| One entry state shared by SharedCaseDetail / inbox badge / AssessmentScreen, counterpart-committed rescue | `client/lib/epaGate.ts`; `epaGate.test.ts` |
| Trainee instrument v2 (self-entrustment + autonomy match + BID + per-case global), v1 labels kept for display | `client/types/sharing.ts`; `client/screens/AssessmentScreen.tsx`; `assessment.test.ts` |
| Attribution inside both committed payloads; `buildRevealedPair` precedence; `partial` flag; narrative carried | `client/lib/revealedPair.ts`, `client/lib/assessmentProcedure.ts`; `revealedPair.test.ts`, `assessmentProcedure.test.ts` |
| Full-pairs-only analytics, PS-only curves, autonomy gap, BID frequencies, named thresholds | `client/lib/assessmentAnalytics.ts`; `assessmentAnalytics.test.ts` |
| Share-time EPA push respects the gate via client `epaEligible` hint (server tier heuristic as fallback) | `client/lib/caseSharing.ts`, `client/lib/pendingEpa.ts` (`epaEligibleRecipientIds`), `server/routes.ts` share handler |
| Derivation runs BEFORE share in the save pipeline; exposure-only save-time alert bullet | `client/hooks/useCaseForm.ts` |
