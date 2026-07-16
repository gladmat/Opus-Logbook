import type { UserProfile } from "@/lib/auth";
import {
  hasAnsweredCategoryPersonalization,
  hasAnsweredHospitalAffiliation,
  hasAnsweredPrivacy,
  hasAnsweredTrainingProgramme,
} from "@/lib/personalization";

export type OnboardingStep =
  | "categories"
  | "training"
  | "hospital"
  | "privacy"
  | "security";

type ProfileLike = Pick<UserProfile, "surgicalPreferences"> | null | undefined;

/**
 * Resolves where a partially-onboarded user should resume.
 *
 * Categories / training / hospital / privacy each persist an answered flag to
 * the profile, so a killed-and-relaunched app lands back on the first step the
 * user hasn't completed. Security (PIN setup) is the terminal step and has no
 * flag of its own — finishing it flips `onboardingComplete`, which retires
 * this resolver entirely. Legacy profiles that predate `privacyAnswered`
 * re-see the Privacy step once, which is harmless (it is informational).
 */
export function getFirstIncompleteOnboardingStep(
  profile: ProfileLike,
  facilitiesCount: number,
): OnboardingStep {
  if (!hasAnsweredCategoryPersonalization(profile)) {
    return "categories";
  }

  if (!hasAnsweredTrainingProgramme(profile)) {
    return "training";
  }

  if (!hasAnsweredHospitalAffiliation(profile) && facilitiesCount === 0) {
    return "hospital";
  }

  if (!hasAnsweredPrivacy(profile)) {
    return "privacy";
  }

  return "security";
}
