/**
 * LRU temp-file cache for decrypted v2 media.
 *
 * Decrypted files live only in {Paths.cache}/opus-decrypt and are swept on app
 * startup, background, logout, and explicit media deletion.
 */

import { File, Directory, Paths } from "expo-file-system";

const CACHE_DIR_NAME = "opus-decrypt";
const MAX_THUMB_ENTRIES = 80;
const MAX_FULL_ENTRIES = 10;

export type DecryptVariant = "thumb" | "full";

class DecryptCache {
  private map = new Map<string, string>();
  private thumbOrder: string[] = [];
  private fullOrder: string[] = [];

  private key(mediaId: string, variant: DecryptVariant): string {
    return `${variant}:${mediaId}`;
  }

  private getCacheDir(): Directory {
    return new Directory(Paths.cache, CACHE_DIR_NAME);
  }

  private ensureCacheDir(): void {
    const dir = this.getCacheDir();
    if (!dir.exists) {
      dir.create({ idempotent: true, intermediates: true });
    }
  }

  private fileFor(
    mediaId: string,
    variant: DecryptVariant,
    mimeType: string,
  ): File {
    const ext = mimeType.includes("png") ? "png" : "jpg";
    return new File(
      Paths.cache,
      CACHE_DIR_NAME,
      `${variant}_${mediaId}.${ext}`,
    );
  }

  getCached(mediaId: string, variant: DecryptVariant): string | null {
    const key = this.key(mediaId, variant);
    const uri = this.map.get(key);
    if (!uri) return null;

    const file = new File(uri);
    if (!file.exists) {
      this.map.delete(key);
      this.removeFromOrder(key, variant);
      return null;
    }

    return uri;
  }

  async materialize(
    mediaId: string,
    variant: DecryptVariant,
    mimeType: string,
    writer: (destPath: string) => Promise<void>,
  ): Promise<string> {
    this.ensureCacheDir();

    const file = this.fileFor(mediaId, variant, mimeType);
    if (file.exists) {
      try {
        file.delete();
      } catch {
        // Ignore stale temp-file cleanup failures.
      }
    }

    await writer(file.uri);
    return this.register(mediaId, variant, file.uri);
  }

  invalidate(mediaId: string): void {
    for (const variant of ["thumb", "full"] as const) {
      const key = this.key(mediaId, variant);
      const uri = this.map.get(key);
      this.map.delete(key);
      this.removeFromOrder(key, variant);

      if (uri) {
        try {
          const file = new File(uri);
          if (file.exists) file.delete();
        } catch {
          // Ignore delete failures during invalidation.
        }
      }
    }
  }

  clearAll(): void {
    this.map.clear();
    this.thumbOrder.length = 0;
    this.fullOrder.length = 0;

    try {
      const dir = this.getCacheDir();
      if (dir.exists) {
        dir.delete();
      }
    } catch {
      // Ignore cache cleanup failures.
    }
  }

  private register(
    mediaId: string,
    variant: DecryptVariant,
    uri: string,
  ): string {
    const key = this.key(mediaId, variant);
    this.removeFromOrder(key, variant);
    this.map.set(key, uri);

    const order = variant === "thumb" ? this.thumbOrder : this.fullOrder;
    const max = variant === "thumb" ? MAX_THUMB_ENTRIES : MAX_FULL_ENTRIES;
    order.push(key);

    while (order.length > max) {
      const oldest = order.shift();
      if (!oldest) continue;
      const oldUri = this.map.get(oldest);
      this.map.delete(oldest);
      if (!oldUri) continue;

      try {
        const file = new File(oldUri);
        if (file.exists) file.delete();
      } catch {
        // Ignore best-effort eviction failures.
      }
    }

    return uri;
  }

  private removeFromOrder(key: string, variant: DecryptVariant): void {
    const order = variant === "thumb" ? this.thumbOrder : this.fullOrder;
    const idx = order.indexOf(key);
    if (idx !== -1) {
      order.splice(idx, 1);
    }
  }
}

export const decryptCache = new DecryptCache();
