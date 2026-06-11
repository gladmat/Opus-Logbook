/**
 * Shared singleton that tracks the currently logged-in user ID.
 *
 * Every user-scoped storage module imports helpers from here so that
 * AsyncStorage / SecureStore / MMKV keys are namespaced per user.
 */

// ── State ────────────────────────────────────────────────────────────────────

let _activeUserId: string | null = null;
const _listeners = new Set<(id: string | null) => void>();

// ── Getters / setters ────────────────────────────────────────────────────────

/** Set (or clear) the active user. Fires all registered change listeners. */
export function setActiveUserId(id: string | null): void {
  if (_activeUserId === id) return;
  _activeUserId = id;
  for (const cb of _listeners) {
    try {
      cb(id);
    } catch (e) {
      if (__DEV__) console.warn("[activeUser] listener threw:", e);
    }
  }
}

/** Returns the active user ID or throws if no user is set. */
export function getActiveUserId(): string {
  if (!_activeUserId) {
    throw new Error("No active user — storage access requires login");
  }
  return _activeUserId;
}

/** Returns the active user ID, or null if none is set. */
export function getActiveUserIdOrNull(): string | null {
  return _activeUserId;
}

// ── Change listeners ─────────────────────────────────────────────────────────

/**
 * Register a callback that fires whenever the active user changes.
 * Returns an unsubscribe function.
 */
export function onActiveUserChange(
  cb: (newId: string | null) => void,
): () => void {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
}

// ── Key helpers ──────────────────────────────────────────────────────────────

function strippedId(): string {
  return getActiveUserId().replace(/-/g, "");
}

/**
 * Returns a user-scoped AsyncStorage key.
 * Delimiter `::` is used because no existing key contains it.
 */
export function userScopedAsyncKey(baseKey: string): string {
  return `${baseKey}::${getActiveUserId()}`;
}

/**
 * Returns a user-scoped SecureStore key.
 * UUID dashes are stripped to save space (36 → 32 chars).
 */
export function userScopedSecureKey(baseKey: string): string {
  return `${baseKey}_${strippedId()}`;
}
