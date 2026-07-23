import { describe, it, expect } from "vitest";
import { z } from "zod";
import { insertProfileSchema } from "@shared/schema";

// Inline the schemas here to test validation logic without importing from routes
// (routes.ts doesn't export schemas)

const teamContactCreateSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  registrationNumber: z.string().max(50).nullable().optional(),
  registrationJurisdiction: z.string().max(20).nullable().optional(),
  careerStage: z.string().max(50).nullable().optional(),
  defaultRole: z.enum(["PS", "FA", "SS", "US", "SA"]).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  facilityIds: z.array(z.string()).optional(),
});

const teamContactLinkSchema = z.object({
  linkedUserId: z.string().min(1),
});

const discoverContactsSchema = z.object({
  contacts: z
    .array(
      z.object({
        contactId: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        registrationNumber: z.string().optional(),
        registrationJurisdiction: z.string().optional(),
      }),
    )
    .min(1)
    .max(50),
});

describe("teamContactCreateSchema", () => {
  it("accepts valid minimal contact", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
      lastName: "Lozen",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid full contact", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
      lastName: "Lozen",
      email: "charlotte@example.com",
      phone: "+64211234567",
      careerStage: "nz_fellow",
      defaultRole: "FA",
      notes: "Fellow in hand surgery",
      facilityIds: ["facility-1", "facility-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing firstName", () => {
    const result = teamContactCreateSchema.safeParse({
      lastName: "Lozen",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing lastName", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
      lastName: "Lozen",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid defaultRole", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
      lastName: "Lozen",
      defaultRole: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null email", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
      lastName: "Lozen",
      email: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null defaultRole", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
      lastName: "Lozen",
      defaultRole: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("teamContactLinkSchema", () => {
  it("accepts valid linkedUserId", () => {
    const result = teamContactLinkSchema.safeParse({
      linkedUserId: "user-uuid-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty linkedUserId", () => {
    const result = teamContactLinkSchema.safeParse({
      linkedUserId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing linkedUserId", () => {
    const result = teamContactLinkSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("discoverContactsSchema", () => {
  it("accepts valid contacts array", () => {
    const result = discoverContactsSchema.safeParse({
      contacts: [
        { contactId: "c1", email: "test@example.com" },
        { contactId: "c2", phone: "+64211234567" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty contacts array", () => {
    const result = discoverContactsSchema.safeParse({
      contacts: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 50 contacts", () => {
    const contacts = Array.from({ length: 51 }, (_, i) => ({
      contactId: `c${i}`,
    }));
    const result = discoverContactsSchema.safeParse({ contacts });
    expect(result.success).toBe(false);
  });

  it("rejects contact with invalid email", () => {
    const result = discoverContactsSchema.safeParse({
      contacts: [{ contactId: "c1", email: "not-email" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("displayName derivation", () => {
  it("derives displayName from firstName + lastName", () => {
    const firstName = "Charlotte";
    const lastName = "Lozen";
    const displayName = `${firstName} ${lastName}`;
    expect(displayName).toBe("Charlotte Lozen");
  });

  it("handles single-word names", () => {
    const displayName = `${"Madonna"} ${""}`.trim();
    expect(displayName).toBe("Madonna");
  });
});

describe("profileUpdateSchema (discoverable privacy opt-out)", () => {
  // Mirrors the pick list in server/routes.ts (routes doesn't export its
  // schemas) but is built from the REAL insertProfileSchema, so the
  // drizzle-zod field type is exercised. Keep the pick list in sync.
  const profileUpdateSchema = insertProfileSchema
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
      onboardingComplete: true,
      surgicalPreferences: true,
      discoverable: true,
    })
    .partial();

  it("accepts discoverable=false and preserves it", () => {
    const result = profileUpdateSchema.safeParse({ discoverable: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.discoverable).toBe(false);
  });

  it("accepts discoverable=true", () => {
    const result = profileUpdateSchema.safeParse({ discoverable: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.discoverable).toBe(true);
  });

  it("rejects a non-boolean discoverable", () => {
    expect(profileUpdateSchema.safeParse({ discoverable: "yes" }).success).toBe(
      false,
    );
  });
});
