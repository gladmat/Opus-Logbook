import { describe, it, expect } from "vitest";
import {
  deriveSafetyNumber,
  deviceFingerprint,
  safetyNumberLines,
  type PartyKeys,
} from "../safetyNumber";

const alice: PartyKeys = {
  userId: "user-alice",
  devices: [
    { deviceId: "dev-a1", publicKey: "pk-alice-1" },
    { deviceId: "dev-a2", publicKey: "pk-alice-2" },
  ],
};

const bob: PartyKeys = {
  userId: "user-bob",
  devices: [{ deviceId: "dev-b1", publicKey: "pk-bob-1" }],
};

describe("deriveSafetyNumber", () => {
  it("is symmetric — both parties see the same number", () => {
    expect(deriveSafetyNumber(alice, bob)).toBe(deriveSafetyNumber(bob, alice));
  });

  it("is stable for the same inputs and matches the expected format", () => {
    const first = deriveSafetyNumber(alice, bob);
    const second = deriveSafetyNumber(alice, bob);
    expect(first).toBe(second);
    expect(first).toMatch(/^(\d{5} ){11}\d{5}$/);
  });

  it("is invariant to device ordering", () => {
    const reordered: PartyKeys = {
      ...alice,
      devices: [...alice.devices].reverse(),
    };
    expect(deriveSafetyNumber(reordered, bob)).toBe(
      deriveSafetyNumber(alice, bob),
    );
  });

  it("changes completely when any device key changes", () => {
    const rotated: PartyKeys = {
      ...bob,
      devices: [{ deviceId: "dev-b1", publicKey: "pk-bob-ROTATED" }],
    };
    expect(deriveSafetyNumber(alice, rotated)).not.toBe(
      deriveSafetyNumber(alice, bob),
    );
  });

  it("changes when a device is added", () => {
    const extra: PartyKeys = {
      ...bob,
      devices: [...bob.devices, { deviceId: "dev-b2", publicKey: "pk-bob-2" }],
    };
    expect(deriveSafetyNumber(alice, extra)).not.toBe(
      deriveSafetyNumber(alice, bob),
    );
  });
});

describe("deviceFingerprint", () => {
  it("renders 4 hex groups of 4 and is key-sensitive", () => {
    const fp = deviceFingerprint("pk-bob-1");
    expect(fp).toMatch(/^[0-9A-F]{4}( [0-9A-F]{4}){3}$/);
    expect(deviceFingerprint("pk-bob-2")).not.toBe(fp);
  });
});

describe("safetyNumberLines", () => {
  it("splits 12 groups into 3 lines of 4", () => {
    const lines = safetyNumberLines(deriveSafetyNumber(alice, bob));
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line).toMatch(/^\d{5}( {2}\d{5}){3}$/);
    }
  });
});
