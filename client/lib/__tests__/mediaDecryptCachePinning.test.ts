import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory file-system stand-in so we can exercise LRU eviction without
// touching a real disk. `expo-file-system`'s `File` / `Directory` new API is
// the shape consumed by mediaDecryptCache.
const existsMap = new Map<string, boolean>();
const deleteCalls: string[] = [];

vi.mock("expo-file-system", () => {
  const Paths = { cache: "/tmp/test-cache" };

  class File {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = parts.join("/").replace("//", "/");
    }
    get exists(): boolean {
      return existsMap.get(this.uri) ?? false;
    }
    delete(): void {
      deleteCalls.push(this.uri);
      existsMap.set(this.uri, false);
    }
  }

  class Directory {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = parts.join("/").replace("//", "/");
    }
    get exists(): boolean {
      return existsMap.get(this.uri) ?? true;
    }
    create(): void {
      existsMap.set(this.uri, true);
    }
    delete(): void {
      deleteCalls.push(this.uri);
      existsMap.set(this.uri, false);
    }
  }

  return { File, Directory, Paths };
});

const { decryptCache } = await import("../mediaDecryptCache");

describe("mediaDecryptCache pin / LRU refcounting", () => {
  beforeEach(() => {
    deleteCalls.length = 0;
    existsMap.clear();
    decryptCache.clearAll();
  });

  async function materializeMock(id: string): Promise<string> {
    return decryptCache.materialize(
      id,
      "full",
      "image/jpeg",
      async (destPath) => {
        // Simulate the writer creating the file on disk.
        existsMap.set(destPath, true);
      },
    );
  }

  it("skips LRU eviction of pinned entries", async () => {
    // MAX_FULL_ENTRIES is 10. Fill to 10, pin one, then push one more.
    // The pinned entry should survive; the OLDEST UNPINNED should evict.
    for (let i = 0; i < 10; i++) {
      await materializeMock(`m${i}`);
    }

    decryptCache.pin("m0", "full");

    // Push the 11th entry — triggers LRU eviction.
    await materializeMock("m10");

    // The pinned entry m0 must still be readable.
    expect(decryptCache.getCached("m0", "full")).not.toBeNull();
    // The oldest UNPINNED entry (m1) should have been evicted.
    expect(decryptCache.getCached("m1", "full")).toBeNull();
  });

  it("evicts normally once a pin is released", async () => {
    for (let i = 0; i < 10; i++) {
      await materializeMock(`m${i}`);
    }
    decryptCache.pin("m0", "full");
    await materializeMock("m10");
    // m0 survived the first eviction.
    expect(decryptCache.getCached("m0", "full")).not.toBeNull();

    decryptCache.unpin("m0", "full");

    // Now push another — m0 should now be eligible for eviction.
    await materializeMock("m11");
    // m0 is now the oldest; it should be gone.
    expect(decryptCache.getCached("m0", "full")).toBeNull();
  });

  it("pin refcounts: two pins, one unpin, still pinned", async () => {
    await materializeMock("x");
    decryptCache.pin("x", "full");
    decryptCache.pin("x", "full");
    decryptCache.unpin("x", "full");

    // Fill cache past capacity with other entries.
    for (let i = 0; i < 11; i++) {
      await materializeMock(`o${i}`);
    }

    // One pin still remains on 'x' — it must survive.
    expect(decryptCache.getCached("x", "full")).not.toBeNull();
  });
});
