import { describe, it, expect } from "vitest";
import { invitationSchema } from "../validation/teamContacts";

describe("invitationSchema", () => {
  it("accepts valid invitation", () => {
    expect(
      invitationSchema.safeParse({
        contactId: "contact-uuid-123",
        email: "charlotte@example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects missing / empty contactId", () => {
    expect(
      invitationSchema.safeParse({ email: "charlotte@example.com" }).success,
    ).toBe(false);
    expect(
      invitationSchema.safeParse({
        contactId: "",
        email: "charlotte@example.com",
      }).success,
    ).toBe(false);
  });

  it("rejects missing / invalid / empty email", () => {
    expect(invitationSchema.safeParse({ contactId: "c" }).success).toBe(false);
    expect(
      invitationSchema.safeParse({ contactId: "c", email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      invitationSchema.safeParse({ contactId: "c", email: "" }).success,
    ).toBe(false);
  });
});
