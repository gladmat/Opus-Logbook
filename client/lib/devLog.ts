/**
 * Development-only logging. `console.*` in hot paths is not free in a
 * release build: Sentry's console breadcrumb capture serialises every
 * argument, and RN's console bridge still runs. Wrap diagnostics that fire
 * per item / per focus in these so release builds skip them entirely
 * (Metro constant-folds `__DEV__`).
 */

export function devWarn(...args: unknown[]): void {
  if (__DEV__) console.warn(...args);
}

export function devError(...args: unknown[]): void {
  if (__DEV__) console.error(...args);
}
