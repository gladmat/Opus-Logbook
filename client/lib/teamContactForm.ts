/**
 * Pure helpers behind AddEditTeamContactScreen's save path, so the
 * identifier rules (E.164 phone, registration pair, locked-while-linked)
 * are unit-testable without rendering the screen.
 */
import type { CreateTeamContactData } from "./teamContactsApi";
import { normalizePhoneE164, type PhoneRegion } from "@shared/phone";
import { buildRegistrationLookupKey } from "@shared/professionalRegistrations";
import type { TeamMemberOperativeRole } from "@/types/teamContacts";

export interface ContactFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  registrationNumber: string;
  registrationJurisdiction: string | null;
  careerStage: string | null;
  defaultRole: TeamMemberOperativeRole | null;
  notes: string;
  facilityIds: string[];
}

export type ContactSavePlan =
  | { ok: true; data: CreateTeamContactData }
  | { ok: false; problem: "phone" | "registration" };

/**
 * Turn form state into the create/update payload. Phones are canonicalised
 * to E.164 with the owner's region (a non-blank phone that can't be parsed
 * blocks the save); a registration number needs a jurisdiction. While the
 * contact is linked the identifier fields are omitted entirely — the server
 * would 409 on a change, and re-sending equal values is pointless.
 */
export function buildContactSavePayload(
  state: ContactFormState,
  opts: { linked: boolean; region?: PhoneRegion },
): ContactSavePlan {
  const base: CreateTeamContactData = {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    careerStage: state.careerStage,
    defaultRole: state.defaultRole,
    notes: state.notes.trim() || null,
    facilityIds: state.facilityIds,
  };
  if (opts.linked) return { ok: true, data: base };

  const phoneRaw = state.phone.trim();
  const phone = phoneRaw ? normalizePhoneE164(phoneRaw, opts.region) : null;
  if (phoneRaw && !phone) return { ok: false, problem: "phone" };

  const registrationNumber = state.registrationNumber.trim();
  if (registrationNumber && !state.registrationJurisdiction) {
    return { ok: false, problem: "registration" };
  }

  return {
    ok: true,
    data: {
      ...base,
      email: state.email.trim() || null,
      phone,
      registrationNumber: registrationNumber || null,
      registrationJurisdiction: registrationNumber
        ? state.registrationJurisdiction
        : null,
    },
  };
}

/**
 * Canonical fingerprint of a contact's identifiers — equal fingerprints mean
 * nothing matchable changed (case/spacing/format differences don't count).
 */
export function contactIdentifierKey(
  ids: {
    email?: string | null;
    phone?: string | null;
    registrationNumber?: string | null;
    registrationJurisdiction?: string | null;
  },
  region?: PhoneRegion,
): string {
  const email = ids.email?.trim().toLowerCase() ?? "";
  const phone = ids.phone
    ? (normalizePhoneE164(ids.phone, region) ?? ids.phone.trim())
    : "";
  const reg =
    buildRegistrationLookupKey(
      ids.registrationJurisdiction,
      ids.registrationNumber,
    ) ?? "";
  return `${email}|${phone}|${reg}`;
}
