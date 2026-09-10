import { insertProfileSchema } from "@shared/schema";

/**
 * PUT /api/profile body. Exported so tests exercise the real pick list —
 * a field missing here is silently dropped by the handler, which is how
 * `phone` stayed unwritable (and phone discovery dead) until 2.26.0.
 */
export const profileUpdateSchema = insertProfileSchema
  .pick({
    fullName: true,
    firstName: true,
    lastName: true,
    dateOfBirth: true,
    sex: true,
    countryOfPractice: true,
    medicalCouncilNumber: true,
    professionalRegistrations: true,
    careerStage: true,
    // Stored as E.164 (normalised in the handler with the profile's region).
    // This is what colleagues match on when they add you by phone.
    phone: true,
    onboardingComplete: true,
    surgicalPreferences: true,
    // Privacy: lets users opt out of colleague search/discovery/linking.
    // The search, discover, discover-psi and team-contact link endpoints
    // all gate on profiles.discoverable === false.
    discoverable: true,
  })
  .partial();
