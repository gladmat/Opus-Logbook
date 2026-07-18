import type { UserProfile } from "@/lib/auth";
import { PROCEDURE_CATEGORIES } from "@/constants/procedureCategories";
import type {
  PersonalizationPreferences,
  SurgicalPreferences,
} from "@/types/surgicalPreferences";
import type { Specialty } from "@/types/case";

type ProfileLike = Pick<UserProfile, "surgicalPreferences"> | null | undefined;

export const ALL_SPECIALTIES = PROCEDURE_CATEGORIES.map(
  (category) => category.id,
);

export function normalizeSelectedSpecialties(
  selectedSpecialties: readonly string[],
): Specialty[] {
  const selectedSet = new Set(selectedSpecialties);
  return ALL_SPECIALTIES.filter((specialty) => selectedSet.has(specialty));
}

export function getPersonalizationPreferences(
  profile: ProfileLike,
): PersonalizationPreferences | undefined {
  return profile?.surgicalPreferences?.personalization;
}

export function getStoredSelectedSpecialties(
  profile: ProfileLike,
): Specialty[] | undefined {
  const selectedSpecialties =
    getPersonalizationPreferences(profile)?.selectedSpecialties;
  if (!Array.isArray(selectedSpecialties)) {
    return undefined;
  }

  return normalizeSelectedSpecialties(selectedSpecialties);
}

export function getVisibleSpecialties(profile: ProfileLike): Specialty[] {
  const selectedSpecialties = getStoredSelectedSpecialties(profile);
  if (!selectedSpecialties || selectedSpecialties.length === 0) {
    return ALL_SPECIALTIES;
  }

  return selectedSpecialties;
}

export function hasAnsweredCategoryPersonalization(profile: ProfileLike) {
  return Array.isArray(
    getPersonalizationPreferences(profile)?.selectedSpecialties,
  );
}

export function hasAnsweredTrainingProgramme(profile: ProfileLike) {
  return (
    getPersonalizationPreferences(profile)?.trainingProgrammeAnswered === true
  );
}

export function hasAnsweredHospitalAffiliation(profile: ProfileLike) {
  return getPersonalizationPreferences(profile)?.hospitalAnswered === true;
}

export function hasAnsweredPrivacy(profile: ProfileLike) {
  return getPersonalizationPreferences(profile)?.privacyAnswered === true;
}

export function buildSurgicalPreferencesUpdate(
  currentPreferences: SurgicalPreferences | undefined,
  updates: Partial<PersonalizationPreferences>,
): SurgicalPreferences {
  return {
    ...currentPreferences,
    personalization: {
      ...currentPreferences?.personalization,
      ...updates,
    },
  };
}
