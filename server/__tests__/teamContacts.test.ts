/**
 * Validation schemas for the team-contact + colleague-lookup routes — the
 * REAL ones from server/validation (the previous local re-declarations
 * had drifted from routes.ts).
 */
import { describe, it, expect } from "vitest";
import {
  discoverContactsSchema,
  teamContactCreateSchema,
  teamContactLinkSchema,
  teamContactUpdateSchema,
  userSearchQuerySchema,
} from "../validation/teamContacts";
import { profileUpdateSchema } from "../validation/profile";

describe("teamContactCreateSchema", () => {
  it("accepts valid minimal contact", () => {
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "Charlotte",
        lastName: "Lozen",
      }).success,
    ).toBe(true);
  });

  it("accepts valid full contact incl. registration pair", () => {
    const result = teamContactCreateSchema.safeParse({
      firstName: "Charlotte",
      lastName: "Lozen",
      email: "charlotte@example.com",
      phone: "+64 21 123 4567",
      registrationNumber: "12 345-ab",
      registrationJurisdiction: "new_zealand",
      careerStage: "nz_fellow",
      defaultRole: "FA",
      notes: "Fellow in hand surgery",
      facilityIds: ["facility-1", "facility-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing firstName / lastName", () => {
    expect(
      teamContactCreateSchema.safeParse({ lastName: "Lozen" }).success,
    ).toBe(false);
    expect(
      teamContactCreateSchema.safeParse({ firstName: "Charlotte" }).success,
    ).toBe(false);
  });

  it("rejects invalid email format and invalid defaultRole", () => {
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        email: "not-an-email",
      }).success,
    ).toBe(false);
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        defaultRole: "INVALID",
      }).success,
    ).toBe(false);
  });

  it("accepts null email / defaultRole", () => {
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        email: null,
        defaultRole: null,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown registration jurisdiction", () => {
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        registrationNumber: "1",
        registrationJurisdiction: "mars",
      }).success,
    ).toBe(false);
  });

  it("rejects a registration number without a jurisdiction and vice versa", () => {
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        registrationNumber: "123",
      }).success,
    ).toBe(false);
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        registrationJurisdiction: "new_zealand",
      }).success,
    ).toBe(false);
    // Blank number counts as absent.
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        registrationNumber: "  ",
        registrationJurisdiction: "new_zealand",
      }).success,
    ).toBe(false);
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        registrationNumber: null,
        registrationJurisdiction: null,
      }).success,
    ).toBe(true);
  });

  it("allows spaced phone input up to 32 chars (normalised later)", () => {
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        phone: "+64 (21) 123-4567",
      }).success,
    ).toBe(true);
    expect(
      teamContactCreateSchema.safeParse({
        firstName: "C",
        lastName: "L",
        phone: "1".repeat(33),
      }).success,
    ).toBe(false);
  });
});

describe("teamContactUpdateSchema", () => {
  it("accepts partial patches that don't touch registration", () => {
    expect(teamContactUpdateSchema.safeParse({ notes: "x" }).success).toBe(
      true,
    );
    expect(teamContactUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("still enforces the registration pair when touched", () => {
    expect(
      teamContactUpdateSchema.safeParse({ registrationNumber: "1" }).success,
    ).toBe(false);
    expect(
      teamContactUpdateSchema.safeParse({
        registrationNumber: "1",
        registrationJurisdiction: "poland",
      }).success,
    ).toBe(true);
    expect(
      teamContactUpdateSchema.safeParse({
        registrationNumber: null,
        registrationJurisdiction: null,
      }).success,
    ).toBe(true);
  });
});

describe("teamContactLinkSchema", () => {
  it("requires a non-empty linkedUserId", () => {
    expect(
      teamContactLinkSchema.safeParse({ linkedUserId: "user-uuid-123" })
        .success,
    ).toBe(true);
    expect(teamContactLinkSchema.safeParse({ linkedUserId: "" }).success).toBe(
      false,
    );
    expect(teamContactLinkSchema.safeParse({}).success).toBe(false);
  });
});

describe("discoverContactsSchema", () => {
  it("accepts valid contacts array incl. registration", () => {
    expect(
      discoverContactsSchema.safeParse({
        contacts: [
          { contactId: "c1", email: "test@example.com" },
          { contactId: "c2", phone: "+64211234567" },
          {
            contactId: "c3",
            registrationNumber: "123",
            registrationJurisdiction: "australia",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects empty, >50, invalid email, unknown jurisdiction", () => {
    expect(discoverContactsSchema.safeParse({ contacts: [] }).success).toBe(
      false,
    );
    expect(
      discoverContactsSchema.safeParse({
        contacts: Array.from({ length: 51 }, (_, i) => ({
          contactId: `c${i}`,
        })),
      }).success,
    ).toBe(false);
    expect(
      discoverContactsSchema.safeParse({
        contacts: [{ contactId: "c1", email: "not-email" }],
      }).success,
    ).toBe(false);
    expect(
      discoverContactsSchema.safeParse({
        contacts: [
          {
            contactId: "c1",
            registrationNumber: "1",
            registrationJurisdiction: "mars",
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("userSearchQuerySchema", () => {
  it("accepts exactly one mode", () => {
    expect(userSearchQuerySchema.safeParse({ email: "a@x.com" }).success).toBe(
      true,
    );
    expect(
      userSearchQuerySchema.safeParse({ phone: "+64211234567" }).success,
    ).toBe(true);
    expect(
      userSearchQuerySchema.safeParse({
        registration: "123",
        jurisdiction: "new_zealand",
      }).success,
    ).toBe(true);
  });

  it("rejects none, two modes, half a registration pair, bad jurisdiction", () => {
    expect(userSearchQuerySchema.safeParse({}).success).toBe(false);
    expect(
      userSearchQuerySchema.safeParse({
        email: "a@x.com",
        phone: "+64211234567",
      }).success,
    ).toBe(false);
    expect(
      userSearchQuerySchema.safeParse({ registration: "123" }).success,
    ).toBe(false);
    expect(
      userSearchQuerySchema.safeParse({ jurisdiction: "new_zealand" }).success,
    ).toBe(false);
    expect(
      userSearchQuerySchema.safeParse({
        registration: "123",
        jurisdiction: "mars",
      }).success,
    ).toBe(false);
  });
});

describe("profileUpdateSchema (discoverable privacy opt-out)", () => {
  it("accepts discoverable=false/true and rejects non-boolean", () => {
    const off = profileUpdateSchema.safeParse({ discoverable: false });
    expect(off.success && off.data.discoverable).toBe(false);
    const on = profileUpdateSchema.safeParse({ discoverable: true });
    expect(on.success && on.data.discoverable).toBe(true);
    expect(profileUpdateSchema.safeParse({ discoverable: "yes" }).success).toBe(
      false,
    );
  });
});
