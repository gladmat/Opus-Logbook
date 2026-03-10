import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock AsyncStorage ───────────────────────────────────────

let store: Record<string, string> = {};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn(async (key: string) => {
      delete store[key];
    }),
  },
}));

import {
  getAlwaysDeleteAfterImport,
  setAlwaysDeleteAfterImport,
} from "../smartImportPrefs";

// ── Setup ───────────────────────────────────────────────────

beforeEach(() => {
  store = {};
});

// ── Tests ───────────────────────────────────────────────────

describe("smartImportPrefs", () => {
  describe("getAlwaysDeleteAfterImport", () => {
    it("returns false by default (no stored value)", async () => {
      expect(await getAlwaysDeleteAfterImport()).toBe(false);
    });

    it("returns false when stored value is not 'true'", async () => {
      store["@opus_smart_import_always_delete"] = "false";
      expect(await getAlwaysDeleteAfterImport()).toBe(false);
    });

    it("returns false for garbage stored value", async () => {
      store["@opus_smart_import_always_delete"] = "maybe";
      expect(await getAlwaysDeleteAfterImport()).toBe(false);
    });

    it("returns true when stored value is 'true'", async () => {
      store["@opus_smart_import_always_delete"] = "true";
      expect(await getAlwaysDeleteAfterImport()).toBe(true);
    });
  });

  describe("setAlwaysDeleteAfterImport", () => {
    it("stores 'true' when enabled", async () => {
      await setAlwaysDeleteAfterImport(true);
      expect(store["@opus_smart_import_always_delete"]).toBe("true");
    });

    it("stores 'false' when disabled", async () => {
      await setAlwaysDeleteAfterImport(false);
      expect(store["@opus_smart_import_always_delete"]).toBe("false");
    });
  });

  describe("round-trip", () => {
    it("set true → read true", async () => {
      await setAlwaysDeleteAfterImport(true);
      expect(await getAlwaysDeleteAfterImport()).toBe(true);
    });

    it("set false → read false", async () => {
      await setAlwaysDeleteAfterImport(false);
      expect(await getAlwaysDeleteAfterImport()).toBe(false);
    });

    it("toggle true → false → read false", async () => {
      await setAlwaysDeleteAfterImport(true);
      await setAlwaysDeleteAfterImport(false);
      expect(await getAlwaysDeleteAfterImport()).toBe(false);
    });

    it("toggle false → true → read true", async () => {
      await setAlwaysDeleteAfterImport(false);
      await setAlwaysDeleteAfterImport(true);
      expect(await getAlwaysDeleteAfterImport()).toBe(true);
    });
  });
});
