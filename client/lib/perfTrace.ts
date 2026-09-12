/**
 * Lightweight, permanent `__DEV__` performance tracing.
 *
 * Wrap a focus loader or a batched decrypt with `perfSpan` / `perfMark` and
 * any span at or above the threshold is logged to Metro as
 * `[perf] <name> <ms>ms`. Production builds constant-fold `__DEV__` so the
 * wrappers collapse to the bare call. Nothing here reads or logs data —
 * names only, never PHI.
 *
 * Span-name convention: `<area>.<operation>` (e.g. `storage.getCases`,
 * `focus.Dashboard`). Grep Metro for `[perf]` to compare before / after.
 */

export const PERF_LOG_THRESHOLD_MS = 16;

function now(): number {
  const perf = (globalThis as { performance?: { now?: () => number } })
    .performance;
  return typeof perf?.now === "function" ? perf.now() : Date.now();
}

function report(name: string, startedAt: number): void {
  const elapsed = now() - startedAt;
  if (elapsed >= PERF_LOG_THRESHOLD_MS) {
    console.log(`[perf] ${name} ${elapsed.toFixed(1)}ms`);
  }
}

/** Time an async operation. Rethrows; still reports on failure. */
export async function perfSpan<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!__DEV__) return fn();
  const startedAt = now();
  try {
    return await fn();
  } finally {
    report(name, startedAt);
  }
}

/** Time a synchronous operation. Rethrows; still reports on failure. */
export function perfSpanSync<T>(name: string, fn: () => T): T {
  if (!__DEV__) return fn();
  const startedAt = now();
  try {
    return fn();
  } finally {
    report(name, startedAt);
  }
}

/**
 * Start a span manually; call the returned function to end it. For
 * focus loaders whose end is a `setState` several awaits later.
 */
export function perfMark(name: string): () => void {
  if (!__DEV__) return () => {};
  const startedAt = now();
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    report(name, startedAt);
  };
}
