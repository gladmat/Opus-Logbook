import { describe, it, expect, vi } from "vitest";

// Simulate the environments where the native module is absent
// (Android, Expo Go, vitest) — the wrapper must no-op, never throw.
vi.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: vi.fn(() => null),
}));

const { excludePhiPathsFromBackup } = await import(
  "../../../modules/opus-backup-guard"
);

describe("opus-backup-guard wrapper", () => {
  it("no-ops safely when the native module is unavailable", async () => {
    await expect(excludePhiPathsFromBackup()).resolves.toEqual({
      excluded: 0,
      missing: 0,
      failed: 0,
    });
  });
});
