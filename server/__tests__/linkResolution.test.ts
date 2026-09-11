/**
 * server/linkResolution.ts — server-verified team-contact links.
 *
 * Pure module with injected storage so the verification order (self →
 * already-linked → target → identifier match → duplicate) is pinned
 * without a database.
 */
import { describe, it, expect, vi } from "vitest";
import {
  isDiscoverable,
  lockedIdentifierChanges,
  resolveLinkCandidates,
  verifyLinkRequest,
  type LinkResolverDeps,
  type LinkableContact,
} from "../linkResolution";

type UserRec = {
  id: string;
  email?: string;
  phone?: string;
  reg?: string[];
  discoverable?: boolean;
};

function makeDeps(
  users: UserRec[],
  linked: {
    ownerUserId: string;
    linkedUserId: string;
    id: string;
    displayName: string;
  }[] = [],
): LinkResolverDeps {
  return {
    getUser: vi.fn(async (id) => users.find((u) => u.id === id)),
    getProfile: vi.fn(async (id) => {
      const u = users.find((x) => x.id === id);
      return u ? { discoverable: u.discoverable ?? true } : undefined;
    }),
    getUserByEmail: vi.fn(async (email) =>
      users.find((u) => u.email === email),
    ),
    getUserByPhone: vi.fn(async (phone) =>
      users.find((u) => u.phone === phone),
    ),
    getUserByRegistrationKey: vi.fn(async (key) =>
      users.find((u) => u.reg?.includes(key)),
    ),
    findContactLinkedTo: vi.fn(async (ownerUserId, linkedUserId) =>
      linked.find(
        (l) => l.ownerUserId === ownerUserId && l.linkedUserId === linkedUserId,
      ),
    ),
  };
}

const OWNER = "owner-1";
const contact = (over: Partial<LinkableContact> = {}): LinkableContact => ({
  id: "c1",
  ownerUserId: OWNER,
  displayName: "Mateo Test",
  linkedUserId: null,
  email: null,
  phone: null,
  registrationNumber: null,
  registrationJurisdiction: null,
  ...over,
});

const MATEO: UserRec = {
  id: "u-mateo",
  email: "mateo@example.com",
  phone: "+64215550100",
  reg: ["reg:new_zealand:12345AB"],
};

describe("isDiscoverable", () => {
  it("treats a missing profile as discoverable (schema default true)", () => {
    expect(isDiscoverable(undefined)).toBe(true);
    expect(isDiscoverable(null)).toBe(true);
    expect(isDiscoverable({ discoverable: null })).toBe(true);
    expect(isDiscoverable({ discoverable: true })).toBe(true);
    expect(isDiscoverable({ discoverable: false })).toBe(false);
  });
});

describe("resolveLinkCandidates", () => {
  it("resolves by email, phone (E.164) and registration key, deduplicated", async () => {
    const deps = makeDeps([MATEO]);
    const ids = await resolveLinkCandidates(
      deps,
      contact({
        email: "Mateo@Example.com",
        phone: "+64 21 555 0100",
        registrationNumber: "12 345-ab",
        registrationJurisdiction: "new_zealand",
      }),
    );
    expect(ids).toEqual(["u-mateo"]);
    expect(deps.getUserByEmail).toHaveBeenCalledWith("mateo@example.com");
    expect(deps.getUserByPhone).toHaveBeenCalledWith("+64215550100");
    expect(deps.getUserByRegistrationKey).toHaveBeenCalledWith(
      "reg:new_zealand:12345AB",
    );
  });

  it("keeps email → phone → registration priority when they disagree", async () => {
    const deps = makeDeps([
      { id: "by-email", email: "a@x.com" },
      { id: "by-phone", phone: "+64215550100" },
      { id: "by-reg", reg: ["reg:other:Z9"] },
    ]);
    const ids = await resolveLinkCandidates(
      deps,
      contact({
        email: "a@x.com",
        phone: "+64215550100",
        registrationNumber: "z-9",
        registrationJurisdiction: "other",
      }),
    );
    expect(ids).toEqual(["by-email", "by-phone", "by-reg"]);
  });

  it("drops users who opted out of discovery", async () => {
    const deps = makeDeps([{ ...MATEO, discoverable: false }]);
    expect(
      await resolveLinkCandidates(deps, contact({ email: MATEO.email })),
    ).toEqual([]);
  });

  it("skips a legacy national-format phone and a jurisdiction-less registration", async () => {
    const deps = makeDeps([MATEO]);
    const ids = await resolveLinkCandidates(
      deps,
      contact({ phone: "021 555 0100", registrationNumber: "12345AB" }),
    );
    expect(ids).toEqual([]);
    expect(deps.getUserByPhone).not.toHaveBeenCalled();
    expect(deps.getUserByRegistrationKey).not.toHaveBeenCalled();
  });
});

describe("verifyLinkRequest", () => {
  it("403 SELF_LINK before anything else", async () => {
    const deps = makeDeps([MATEO]);
    const verdict = await verifyLinkRequest(deps, {
      contact: contact({ email: MATEO.email }),
      requestedUserId: OWNER,
    });
    expect(verdict).toMatchObject({
      ok: false,
      status: 403,
      code: "SELF_LINK",
    });
    expect(deps.getUser).not.toHaveBeenCalled();
  });

  it("is idempotent when already linked to the same user", async () => {
    const verdict = await verifyLinkRequest(makeDeps([MATEO]), {
      contact: contact({ linkedUserId: "u-mateo" }),
      requestedUserId: "u-mateo",
    });
    expect(verdict).toEqual({
      ok: true,
      userId: "u-mateo",
      alreadyLinked: true,
    });
  });

  it("409 CONTACT_ALREADY_LINKED when linked to someone else", async () => {
    const verdict = await verifyLinkRequest(makeDeps([MATEO]), {
      contact: contact({ linkedUserId: "u-other", email: MATEO.email }),
      requestedUserId: "u-mateo",
    });
    expect(verdict).toMatchObject({
      status: 409,
      code: "CONTACT_ALREADY_LINKED",
    });
  });

  it("404 for a missing or non-discoverable target", async () => {
    expect(
      await verifyLinkRequest(makeDeps([MATEO]), {
        contact: contact({ email: MATEO.email }),
        requestedUserId: "u-ghost",
      }),
    ).toMatchObject({ status: 404 });
    expect(
      await verifyLinkRequest(makeDeps([{ ...MATEO, discoverable: false }]), {
        contact: contact({ email: MATEO.email }),
        requestedUserId: "u-mateo",
      }),
    ).toMatchObject({ status: 404 });
  });

  it("409 NO_IDENTIFIER_MATCH when the target isn't reachable from the contact", async () => {
    const deps = makeDeps([MATEO, { id: "u-stranger", email: "s@x.com" }]);
    const verdict = await verifyLinkRequest(deps, {
      contact: contact({ email: MATEO.email }),
      requestedUserId: "u-stranger",
    });
    expect(verdict).toMatchObject({
      status: 409,
      code: "NO_IDENTIFIER_MATCH",
      message: expect.stringContaining("Mateo Test"),
    });
  });

  it("409 DUPLICATE_LINK names the contact already holding the link", async () => {
    const deps = makeDeps(
      [MATEO],
      [
        {
          ownerUserId: OWNER,
          linkedUserId: "u-mateo",
          id: "c-first",
          displayName: "M. Test (old)",
        },
      ],
    );
    const verdict = await verifyLinkRequest(deps, {
      contact: contact({ id: "c-second", phone: MATEO.phone }),
      requestedUserId: "u-mateo",
    });
    expect(verdict).toMatchObject({
      status: 409,
      code: "DUPLICATE_LINK",
      conflict: { contactId: "c-first", displayName: "M. Test (old)" },
      message: expect.stringContaining("M. Test (old)"),
    });
  });

  it("does not treat the contact itself as a duplicate holder", async () => {
    const deps = makeDeps(
      [MATEO],
      [
        {
          ownerUserId: OWNER,
          linkedUserId: "u-mateo",
          id: "c1",
          displayName: "Mateo Test",
        },
      ],
    );
    const verdict = await verifyLinkRequest(deps, {
      contact: contact({ email: MATEO.email }),
      requestedUserId: "u-mateo",
    });
    expect(verdict).toEqual({
      ok: true,
      userId: "u-mateo",
      alreadyLinked: false,
    });
  });

  it("ok when the registration key is the only match", async () => {
    const verdict = await verifyLinkRequest(makeDeps([MATEO]), {
      contact: contact({
        registrationNumber: "12345ab",
        registrationJurisdiction: "new_zealand",
      }),
      requestedUserId: "u-mateo",
    });
    expect(verdict).toMatchObject({ ok: true, alreadyLinked: false });
  });
});

describe("lockedIdentifierChanges", () => {
  const existing = {
    email: "mateo@example.com",
    phone: "+64215550100",
    registrationNumber: "12345AB",
    registrationJurisdiction: "new_zealand",
  };

  it("ignores keys absent from the patch", () => {
    expect(lockedIdentifierChanges(existing, {})).toEqual([]);
    expect(
      lockedIdentifierChanges(existing, { email: undefined } as never),
    ).toEqual([]);
  });

  it("treats normalised-equal values as unchanged", () => {
    expect(
      lockedIdentifierChanges(
        existing,
        {
          email: " Mateo@Example.com ",
          phone: "021 555 0100",
          registrationNumber: "12 345-ab",
          registrationJurisdiction: "new_zealand",
        },
        "NZ",
      ),
    ).toEqual([]);
  });

  it("reports every identifier that really changes", () => {
    expect(
      lockedIdentifierChanges(existing, {
        email: "other@example.com",
        phone: null,
        registrationNumber: "99",
        registrationJurisdiction: "new_zealand",
      }),
    ).toEqual(["email", "phone", "registration"]);
  });

  it("a jurisdiction-only change is a registration change", () => {
    expect(
      lockedIdentifierChanges(existing, {
        registrationJurisdiction: "australia",
      }),
    ).toEqual(["registration"]);
  });

  it("clearing an empty identifier is not a change", () => {
    expect(
      lockedIdentifierChanges(
        {
          email: null,
          phone: null,
          registrationNumber: null,
          registrationJurisdiction: null,
        },
        {
          email: null,
          phone: "",
          registrationNumber: null,
          registrationJurisdiction: null,
        },
      ),
    ).toEqual([]);
  });
});
