-- Backfill career_stage on linked team contacts from the linked user's
-- profile.
--
-- linkTeamContact historically set only linked_user_id + link_confirmed_at,
-- leaving career_stage NULL unless the owner typed it by hand. The client's
-- EPA derivation drops any team member without a career stage (seniority-tier
-- gate), so every contact linked through discovery or the manual Link flow
-- silently produced zero EPA targets.
--
-- Fill-gap only: a stage the owner entered by hand is never overwritten,
-- matching the fill-gap semantics of rehydrateTeamSnapshots on the client
-- and the COALESCE now applied in storage.linkTeamContact.

UPDATE team_contacts tc
SET career_stage = p.career_stage,
    updated_at = CURRENT_TIMESTAMP
FROM profiles p
WHERE tc.linked_user_id = p.user_id
  AND tc.career_stage IS NULL
  AND p.career_stage IS NOT NULL;
