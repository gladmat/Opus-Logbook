import { describe, it, expect } from "vitest";
import {
  buildContactSavePayload,
  contactIdentifierKey,
  type ContactFormState,
} from "../teamContactForm";

const state = (over: Partial<ContactFormState> = {}): ContactFormState => ({
  firstName: " Mateo ",
  lastName: "Test",
  email: " Mateo@Example.com ",
  phone: "021 123 4567",
  registrationNumber: "12 345-ab",
  registrationJurisdiction: "new_zealand",
  careerStage: "nz_set_trainee",
  defaultRole: "FA",
  notes: "  ",
  facilityIds: ["f1"],
  ...over,
});

describe("buildContactSavePayload", () => {
  it("trims, canonicalises the phone with the region, keeps the registration pair", () => {
    const plan = buildContactSavePayload(state(), {
      linked: false,
      region: "NZ",
    });
    expect(plan).toEqual({
      ok: true,
      data: {
        firstName: "Mateo",
        lastName: "Test",
        careerStage: "nz_set_trainee",
        defaultRole: "FA",
        notes: null,
        facilityIds: ["f1"],
        email: "Mateo@Example.com",
        phone: "+64211234567",
        registrationNumber: "12 345-ab",
        registrationJurisdiction: "new_zealand",
      },
    });
  });

  it("blocks a non-blank phone that can't be parsed", () => {
    expect(
      buildContactSavePayload(state({ phone: "021 123 4567" }), {
        linked: false,
      }),
    ).toEqual({ ok: false, problem: "phone" });
    expect(
      buildContactSavePayload(state({ phone: "junk" }), {
        linked: false,
        region: "NZ",
      }),
    ).toEqual({ ok: false, problem: "phone" });
  });

  it("blank identifiers become null; a jurisdiction without a number is dropped", () => {
    const plan = buildContactSavePayload(
      state({ email: "", phone: "  ", registrationNumber: "" }),
      { linked: false, region: "NZ" },
    );
    expect(plan.ok && plan.data).toMatchObject({
      email: null,
      phone: null,
      registrationNumber: null,
      registrationJurisdiction: null,
    });
  });

  it("a registration number without a jurisdiction blocks the save", () => {
    expect(
      buildContactSavePayload(state({ registrationJurisdiction: null }), {
        linked: false,
        region: "NZ",
      }),
    ).toEqual({ ok: false, problem: "registration" });
  });

  it("omits every identifier while linked (server locks them)", () => {
    const plan = buildContactSavePayload(state({ phone: "junk" }), {
      linked: true,
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.data).not.toHaveProperty("email");
      expect(plan.data).not.toHaveProperty("phone");
      expect(plan.data).not.toHaveProperty("registrationNumber");
      expect(plan.data).not.toHaveProperty("registrationJurisdiction");
      expect(plan.data.firstName).toBe("Mateo");
    }
  });
});

describe("contactIdentifierKey", () => {
  it("is stable across formatting variants", () => {
    const a = contactIdentifierKey(
      {
        email: "Mateo@Example.com",
        phone: "021 123 4567",
        registrationNumber: "12 345-ab",
        registrationJurisdiction: "new_zealand",
      },
      "NZ",
    );
    const b = contactIdentifierKey({
      email: "mateo@example.com",
      phone: "+64211234567",
      registrationNumber: "12345AB",
      registrationJurisdiction: "new_zealand",
    });
    expect(a).toBe(b);
    expect(a).toBe("mateo@example.com|+64211234567|reg:new_zealand:12345AB");
  });

  it("changes when any identifier changes and is empty for none", () => {
    expect(contactIdentifierKey({})).toBe("||");
    expect(contactIdentifierKey({ email: "a@x.com" })).not.toBe(
      contactIdentifierKey({ email: "b@x.com" }),
    );
    expect(
      contactIdentifierKey({
        registrationNumber: "1",
        registrationJurisdiction: "poland",
      }),
    ).not.toBe(
      contactIdentifierKey({
        registrationNumber: "1",
        registrationJurisdiction: "germany",
      }),
    );
  });
});
