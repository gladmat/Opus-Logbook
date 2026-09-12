import type { AppStateStatus } from "react-native";

/**
 * When to drop the in-memory decrypted caches on an AppState transition.
 *
 * `inactive` fires for share sheets, the Face ID prompt, photo pickers,
 * Control Centre and notification banners — the app is still on screen and
 * the user is mid-workflow, so purging there forced a full re-decrypt of
 * every summary + thumbnail on return (the 2026-09-12 "sometimes lags"
 * report). A process-memory dump of an on-screen app is no different from
 * an active one, so the purge only buys anything on REAL backgrounding —
 * which is also the only transition that starts the auto-lock clock.
 */
export type PurgeAction = "purge" | "none";

export function resolvePurgeAction(next: AppStateStatus): PurgeAction {
  return next === "background" ? "purge" : "none";
}
