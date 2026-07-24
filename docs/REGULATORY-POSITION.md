# Regulatory Position Statement

> Not yet written. The intake list below collects items flagged from blueprints
> that require a documented regulatory position before the statement is drafted.

## Intake

From `EPA-ARCHITECTURE.md` §8 (added 2026-07-24, review round 1):

1. **EPA retention & erasure on account deletion.** EPA records are personal data
   about identifiable colleagues. Server-side, `users` FK cascades already remove
   every share the departing user is party to and, with them, every assessment by
   and about them (`shared/schema.ts`). Counterparts' local decrypted copies
   (`RevealedAssessmentPair` on their devices) survive and are unreachable — E2EE
   makes erasure propagation unenforceable, and the position statement must not
   imply deletion reaches counterparts' devices. Define the retention position on
   this honest basis (revealed assessment ≈ disclosure already made to an
   identified colleague).
2. **EPA permanence & rectification.** Entrustment ratings are immutable once
   revealed (no edit/retraction endpoint exists) and feed a colleague's permanent
   analytics. GDPR accuracy/rectification rights and basic fairness require a
   documented dispute/appeal position — what a trainee can do about a rating they
   consider wrong, and what a rater can amend post-reveal. Open product decision
   with legal weight; not resolved by the EPA blueprint.
