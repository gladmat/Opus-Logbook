/**
 * Registry of in-memory, per-user caches that must be dropped together.
 *
 * `storage.clearUserCaches()` is the single purge entry point (logout,
 * account deletion, app lock, real backgrounding). Modules that keep their
 * own decrypted in-memory cache (assessment records, shared-case blobs,
 * cached outbox …) register a clearer here instead of `storage.ts`
 * importing each of them — which would create import cycles, since several
 * of those modules already import from `storage.ts`.
 */

const clearers = new Set<() => void>();

/** Register a cache clearer. Returns an unregister function (tests). */
export function registerUserCache(clear: () => void): () => void {
  clearers.add(clear);
  return () => {
    clearers.delete(clear);
  };
}

/** Run every registered clearer. Individual failures never block the rest. */
export function clearRegisteredUserCaches(): void {
  for (const clear of clearers) {
    try {
      clear();
    } catch {
      // A cache clearer must never take the purge down with it.
    }
  }
}

/** Number of registered clearers (diagnostics / tests). */
export function registeredUserCacheCount(): number {
  return clearers.size;
}
