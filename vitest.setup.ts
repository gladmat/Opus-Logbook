/**
 * Vitest global setup. Runs once per test file before any imports.
 *
 * Purpose: stub Expo native-module bridges so test files that transitively
 * import `expo-secure-store`, `expo-modules-core`, etc. can load under Node.
 * Metro normally injects `globalThis.expo` at bundle time; Vitest does not.
 *
 * Individual tests may still `vi.mock(...)` with richer behaviour as needed.
 */

import { vi } from "vitest";

// Minimal expo-modules-core surface so imports resolve in Node.
(globalThis as unknown as { expo: unknown }).expo = {
  EventEmitter: class MockEventEmitter {
    addListener() {
      return { remove() {} };
    }
    removeAllListeners() {}
    emit() {}
  },
  modules: {},
  uuidv4: () => "00000000-0000-0000-0000-000000000000",
  uuidv5: () => "00000000-0000-0000-0000-000000000000",
};

// expo-secure-store: in-memory fallback. Tests that care about its behaviour
// should vi.mock it themselves with richer fixtures.
vi.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    WHEN_UNLOCKED: "WHEN_UNLOCKED",
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
  };
});
