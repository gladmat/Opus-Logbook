/**
 * `fetch` with a hard deadline. React Native's fetch has no timeout, so a
 * stalled request (captive portal, dead server) held loading gates and
 * focus polls open indefinitely. The wrapper aborts after `timeoutMs`,
 * chains any caller-supplied `signal`, and always clears its timer.
 */

export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

export function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const external = init.signal ?? null;

  if (external?.aborted) {
    controller.abort();
  } else if (external) {
    external.addEventListener("abort", () => controller.abort(), {
      once: true,
    });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}
