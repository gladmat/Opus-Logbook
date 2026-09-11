/**
 * Zod schemas for the team-contact, invitation and colleague-lookup routes.
 * Exported (rather than declared inline in routes.ts) so the test suite
 * validates the schemas the server actually runs — the previous copies in
 * server/__tests__ drifted from routes.ts unnoticed.
 */
import { z } from "zod";
import { PROFESSIONAL_REGISTRATION_JURISDICTIONS } from "@shared/professionalRegistrations";

/** Machine-readable codes carried in `{ error, code }` 4xx bodies. */
export const LINK_ERROR_CODES = [
  "SELF_LINK",
  "DUPLICATE_LINK",
  "NO_IDENTIFIER_MATCH",
  "CONTACT_ALREADY_LINKED",
  "LINKED_IDENTIFIERS_LOCKED",
  "INVITE_COOLDOWN",
] as const;
export type LinkErrorCode = (typeof LINK_ERROR_CODES)[number];

const registrationJurisdictionSchema = z
  .enum(PROFESSIONAL_REGISTRATION_JURISDICTIONS)
  .nullable()
  .optional();

/**
 * Registration number and jurisdiction travel together: a number without a
 * jurisdiction has no lookup key and can never match. Only enforced when at
 * least one of the pair is present in the payload (partial updates that
 * don't touch registration are fine).
 */
function refineRegistrationPair(
  data: {
    registrationNumber?: string | null;
    registrationJurisdiction?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  const touched =
    "registrationNumber" in data || "registrationJurisdiction" in data;
  if (!touched) return;
  const hasNumber = !!data.registrationNumber?.trim();
  const hasJurisdiction = !!data.registrationJurisdiction;
  if (hasNumber !== hasJurisdiction) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: hasNumber ? ["registrationJurisdiction"] : ["registrationNumber"],
      message: "Registration number and jurisdiction must be provided together",
    });
  }
}

const teamContactFieldsSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().max(255).nullable().optional(),
  // Raw user input; the handler normalises to E.164 with the owner's region
  // (spaces/brackets allowed, hence 32 not the column's 20).
  phone: z.string().max(32).nullable().optional(),
  registrationNumber: z.string().max(50).nullable().optional(),
  registrationJurisdiction: registrationJurisdictionSchema,
  careerStage: z.string().max(50).nullable().optional(),
  defaultRole: z.enum(["PS", "FA", "SS", "US", "SA"]).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  facilityIds: z.array(z.string()).optional(),
});

export const teamContactCreateSchema = teamContactFieldsSchema.superRefine(
  refineRegistrationPair,
);

export const teamContactUpdateSchema = teamContactFieldsSchema
  .partial()
  .superRefine(refineRegistrationPair);

export type TeamContactCreateInput = z.infer<typeof teamContactCreateSchema>;
export type TeamContactUpdateInput = z.infer<typeof teamContactUpdateSchema>;

export const teamContactLinkSchema = z.object({
  linkedUserId: z.string().min(1),
});

export const discoverContactsSchema = z.object({
  contacts: z
    .array(
      z.object({
        contactId: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().max(32).optional(),
        registrationNumber: z.string().max(50).optional(),
        registrationJurisdiction: z
          .enum(PROFESSIONAL_REGISTRATION_JURISDICTIONS)
          .optional(),
      }),
    )
    .min(1)
    .max(50),
});

export const discoverPsiSchema = z.object({
  blinded: z
    .array(
      z.object({
        ref: z.string().min(1).max(120),
        // Hex-encoded ristretto255 element (32 bytes).
        point: z.string().regex(/^[0-9a-f]{64}$/),
      }),
    )
    .min(1)
    .max(100),
});

export const invitationSchema = z.object({
  contactId: z.string().min(1),
  email: z.string().email(),
});

/**
 * GET /api/users/search — exactly one lookup mode per request:
 * `email`, `phone`, or `registration` + `jurisdiction`.
 */
export const userSearchQuerySchema = z
  .object({
    email: z.string().email().max(255).optional(),
    phone: z.string().min(3).max(32).optional(),
    registration: z.string().min(1).max(64).optional(),
    jurisdiction: z.enum(PROFESSIONAL_REGISTRATION_JURISDICTIONS).optional(),
  })
  .superRefine((q, ctx) => {
    const modes = [
      !!q.email,
      !!q.phone,
      !!(q.registration || q.jurisdiction),
    ].filter(Boolean).length;
    if (modes !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one of: email, phone, or registration+jurisdiction",
      });
      return;
    }
    if (
      (q.registration && !q.jurisdiction) ||
      (!q.registration && q.jurisdiction)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "registration and jurisdiction must be provided together",
      });
    }
  });
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
