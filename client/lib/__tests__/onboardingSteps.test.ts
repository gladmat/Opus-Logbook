import { describe, expect, it } from "vitest";
import { getFirstIncompleteOnboardingStep } from "@/lib/onboardingSteps";
import type { UserProfile } from "@/lib/auth";
import type { PersonalizationPreferences } from "@/types/surgicalPreferences";

function profileWith(
  personalization: PersonalizationPreferences | undefined,
): Pick<UserProfile, "surgicalPreferences"> {
  return {
    surgicalPreferences: personalization ? { personalization } : {},
  } as Pick<UserProfile, "surgicalPreferences">;
}

const ANSWERED_THROUGH_HOSPITAL: PersonalizationPreferences = {
  selectedSpecialties: ["hand_wrist"],
  trainingProgramme: null,
  trainingProgrammeAnswered: true,
  hospitalAnswered: true,
};

describe("getFirstIncompleteOnboardingStep", () => {
  it("returns categories for a null profile", () => {
    expect(getFirstIncompleteOnboardingStep(null, 0)).toBe("categories");
    expect(getFirstIncompleteOnboardingStep(undefined, 0)).toBe("categories");
  });

  it("returns categories when personalization is missing", () => {
    expect(getFirstIncompleteOnboardingStep(profileWith(undefined), 0)).toBe(
      "categories",
    );
  });

  it("treats an empty selectedSpecialties array as answered", () => {
    // Documents the Array.isArray semantics: skipping with "all categories"
    // stores an array, so any array — even empty — counts as answered.
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith({ selectedSpecialties: [] }),
        0,
      ),
    ).toBe("training");
  });

  it("returns training when the training question is unanswered", () => {
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith({ selectedSpecialties: ["breast"] }),
        0,
      ),
    ).toBe("training");
  });

  it("returns hospital when unanswered and no facilities exist", () => {
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith({
          selectedSpecialties: ["breast"],
          trainingProgrammeAnswered: true,
        }),
        0,
      ),
    ).toBe("hospital");
  });

  it("skips hospital when facilities already exist", () => {
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith({
          selectedSpecialties: ["breast"],
          trainingProgrammeAnswered: true,
        }),
        2,
      ),
    ).toBe("privacy");
  });

  it("skips hospital when hospitalAnswered even with zero facilities", () => {
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith({
          selectedSpecialties: ["breast"],
          trainingProgrammeAnswered: true,
          hospitalAnswered: true,
        }),
        0,
      ),
    ).toBe("privacy");
  });

  it("returns privacy for legacy profiles without privacyAnswered", () => {
    // Regression guard: users mid-onboarding before the flag existed replay
    // the informational Privacy step once instead of skipping ahead.
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith(ANSWERED_THROUGH_HOSPITAL),
        1,
      ),
    ).toBe("privacy");
  });

  it("returns security once privacy is answered", () => {
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith({ ...ANSWERED_THROUGH_HOSPITAL, privacyAnswered: true }),
        1,
      ),
    ).toBe("security");
  });

  it("returns security when everything is answered with no facilities", () => {
    expect(
      getFirstIncompleteOnboardingStep(
        profileWith({ ...ANSWERED_THROUGH_HOSPITAL, privacyAnswered: true }),
        0,
      ),
    ).toBe("security");
  });
});
