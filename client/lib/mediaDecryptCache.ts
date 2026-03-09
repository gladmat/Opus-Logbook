/**
 * LRU temp-file cache for decrypted v2 media.
 *
 * Writes decrypted bytes to {Paths.cache}/opus-decrypt/ as temp files.
 * Two pools: thumbnails (max 80, ~2MB) and full images (max 10, ~50MB).
 * Files auto-cleared on app background via AppLockContext.
 *
 * Returns file:/// URIs for direct use with expo-image's Image component.
 */

import { File, Directory, Paths } from "expo-file-system";

// ═══════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════

const CACHE_DIR_NAME = "opus-decrypt";
const MAX_THUMB_ENTRIES = 80;
const MAX_FULL_ENTRIES = 10;

type Variant = "thumb" | "full";

// ═══════════════════════════════════════════════════════════
// Cache implementation
// ═══════════════════════════════════════════════════════════

class DecryptCache {
  /** Maps "variant:mediaId" → file URI string */
  private map = new Map<string, string>();
  /** Insertion order for LRU eviction, per variant */
  private thumbOrder: string[] = [];
  private fullOrder: string[] = [];

  private key(mediaId: string, variant: Variant): string {
    return `${variant}:${mediaId}`;
  }

  private getCacheDir(): Directory {
    return new Directory(Paths.cache, CACHE_DIR_NAME);
  }

  private ensureCacheDir(): void {
    const dir = this.getCacheDir();
    if (!dir.exists) {
      dir.create({ intermediates: true });
    }
  }

  /** Get cached file URI, or null if not cached */
  getCached(mediaId: string, variant: Variant): string | null {
    const k = this.key(mediaId, variant);
    const uri = this.map.get(k);
    if (!uri) return null;

    // Verify file still exists (OS may have purged cache)
    try {
      const file = new File(uri);
      if (!file.exists) {
        this.map.delete(k);
        this.removeFromOrder(k, variant);
        return null;
      }
    } catch {
      this.map.delete(k);
      this.removeFromOrder(k, variant);
      return null;
    }

    return uri;
  }

  /** Write decrypted bytes to a temp file and cache the URI */
  put(
    mediaId: string,
    variant: Variant,
    bytes: Uint8Array,
    mimeType: string,
  ): string {
    this.ensureCacheDir();

    const ext = mimeType.includes("png") ? "png" : "jpg";
    const fileName = `${variant}_${mediaId}.${ext}`;
    const file = new File(Paths.cache, CACHE_DIR_NAME, fileName);
    file.write(bytes);

    const fileUri = file.uri;
    const k = this.key(mediaId, variant);

    // Update LRU
    this.removeFromOrder(k, variant);
    this.map.set(k, fileUri);

    const order = variant === "thumb" ? this.thumbOrder : this.fullOrder;
    const max = variant === "thumb" ? MAX_THUMB_ENTRIES : MAX_FULL_ENTRIES;
    order.push(k);

    // Evict oldest
    while (order.length > max) {
      const oldest = order.shift();
      if (oldest) {
        const oldUri = this.map.get(oldest);
        this.map.delete(oldest);
        if (oldUri) {
          try {
            const f = new File(oldUri);
            if (f.exists) f.delete();
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }

    return fileUri;
  }

  /** Remove a specific item from cache */
  invalidate(mediaId: string): void {
    for (const variant of ["thumb", "full"] as Variant[]) {
      const k = this.key(mediaId, variant);
      const uri = this.map.get(k);
      this.map.delete(k);
      this.removeFromOrder(k, variant);
      if (uri) {
        try {
          const f = new File(uri);
          if (f.exists) f.delete();
        } catch {
          // Ignore
        }
      }
    }
  }

  /** Delete entire cache directory + reset maps (called on app background) */
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
      // Ignore cleanup errors
    }
  }

  private removeFromOrder(key: string, variant: Variant): void {
    const order = variant === "thumb" ? this.thumbOrder : this.fullOrder;
    const idx = order.indexOf(key);
    if (idx !== -1) order.splice(idx, 1);
  }
}

// ═══════════════════════════════════════════════════════════
// Singleton export
// ═══════════════════════════════════════════════════════════

export const decryptCache = new DecryptCache();
