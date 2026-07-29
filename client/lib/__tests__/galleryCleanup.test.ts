import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Alert, type AlertButton } from "react-native";
import { setActiveUserId } from "../activeUser";
import { getAlwaysDeleteAfterImport } from "../smartImportPrefs";
import {
  collectDeletableAssetIds,
  resolveCleanupAction,
  deleteGalleryAssets,
  offerGalleryCleanup,
} from "../galleryCleanup";

// ── Mock AsyncStorage (backs smartImportPrefs) ──────────────

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

// ── Mock expo-media-library / expo-haptics ──────────────────

const requestPermissionsAsync = vi.fn(async () => ({ status: "granted" }));
const deleteAssetsAsync = vi.fn(async () => true);

vi.mock("expo-media-library", () => ({
  requestPermissionsAsync: (...args: unknown[]) =>
    requestPermissionsAsync(...(args as [])),
  deleteAssetsAsync: (...args: unknown[]) => deleteAssetsAsync(...(args as [])),
}));

vi.mock("expo-haptics", () => ({
  notificationAsync: vi.fn(),
  NotificationFeedbackType: { Success: "success" },
}));

// ── Helpers ─────────────────────────────────────────────────

let alertSpy: ReturnType<typeof vi.spyOn>;

function seedAlwaysDelete(value: boolean) {
  const key = `@opus_smart_import_always_delete::test-user-00000000-0000-0000-0000`;
  store[key] = value ? "true" : "false";
}

function lastAlertButtons(): AlertButton[] {
  const call = alertSpy.mock.calls.at(-1);
  return (call?.[2] ?? []) as AlertButton[];
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  store = {};
  setActiveUserId("test-user-00000000-0000-0000-0000");
  requestPermissionsAsync.mockClear();
  requestPermissionsAsync.mockResolvedValue({ status: "granted" });
  deleteAssetsAsync.mockClear();
  deleteAssetsAsync.mockResolvedValue(true);
  alertSpy = vi.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

// ── Tests ───────────────────────────────────────────────────

describe("collectDeletableAssetIds", () => {
  it("filters null, undefined, and empty ids while preserving order", () => {
    expect(
      collectDeletableAssetIds(["a", null, undefined, "", "b", "c"]),
    ).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(collectDeletableAssetIds([])).toEqual([]);
  });
});

describe("resolveCleanupAction", () => {
  it("returns none when no ids regardless of preference", () => {
    expect(resolveCleanupAction([], false)).toBe("none");
    expect(resolveCleanupAction([], true)).toBe("none");
  });

  it("returns delete_silently when always-delete is set", () => {
    expect(resolveCleanupAction(["a"], true)).toBe("delete_silently");
  });

  it("returns prompt when ids exist and preference unset", () => {
    expect(resolveCleanupAction(["a"], false)).toBe("prompt");
  });
});

describe("deleteGalleryAssets", () => {
  it("deletes and returns true when permission granted", async () => {
    expect(await deleteGalleryAssets(["a", "b"])).toBe(true);
    expect(deleteAssetsAsync).toHaveBeenCalledWith(["a", "b"]);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("returns false and informs when permission denied", async () => {
    requestPermissionsAsync.mockResolvedValue({ status: "denied" });
    expect(await deleteGalleryAssets(["a"])).toBe(false);
    expect(deleteAssetsAsync).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Permission Required",
      expect.stringContaining("kept safely"),
    );
  });

  it("returns false and informs when deletion throws", async () => {
    deleteAssetsAsync.mockRejectedValue(new Error("boom"));
    expect(await deleteGalleryAssets(["a"])).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith(
      "Could Not Delete",
      expect.stringContaining("manually"),
    );
  });
});

describe("offerGalleryCleanup", () => {
  it("no-ops when no usable asset ids", async () => {
    await offerGalleryCleanup([null, undefined, ""]);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(deleteAssetsAsync).not.toHaveBeenCalled();
  });

  it("deletes silently without prompting when always-delete is set", async () => {
    seedAlwaysDelete(true);
    await offerGalleryCleanup(["a", "b"]);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(deleteAssetsAsync).toHaveBeenCalledWith(["a", "b"]);
  });

  it("prompts with three actions and does not delete until confirmed", async () => {
    await offerGalleryCleanup(["a"]);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(deleteAssetsAsync).not.toHaveBeenCalled();

    const buttons = lastAlertButtons();
    expect(buttons.map((b) => b.text)).toEqual([
      "Delete Originals",
      "Always Delete After Import",
      "Keep Originals",
    ]);

    buttons[0]?.onPress?.();
    await flushAsync();
    expect(deleteAssetsAsync).toHaveBeenCalledWith(["a"]);
  });

  it("keep originals leaves the library untouched", async () => {
    await offerGalleryCleanup(["a"]);
    lastAlertButtons()[2]?.onPress?.();
    await flushAsync();
    expect(deleteAssetsAsync).not.toHaveBeenCalled();
  });

  it("always-delete button persists the preference and deletes", async () => {
    await offerGalleryCleanup(["a"]);
    lastAlertButtons()[1]?.onPress?.();
    await flushAsync();
    expect(deleteAssetsAsync).toHaveBeenCalledWith(["a"]);
    expect(await getAlwaysDeleteAfterImport()).toBe(true);
  });

  it("filters unusable ids before prompting", async () => {
    await offerGalleryCleanup(["a", null, "b", undefined]);
    lastAlertButtons()[0]?.onPress?.();
    await flushAsync();
    expect(deleteAssetsAsync).toHaveBeenCalledWith(["a", "b"]);
  });
});
