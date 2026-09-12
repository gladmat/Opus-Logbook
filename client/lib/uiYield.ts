import { InteractionManager } from "react-native";

/**
 * Yield to the UI thread so pending interactions (touches, navigation) are
 * processed before the next chunk of JS work runs. Resolves after the
 * current interaction batch — cheap when nothing is pending.
 */
export function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

/**
 * Run `worker` over `items` in fixed-size batches, yielding to the UI thread
 * between batches. Use this instead of a bare `Promise.all(items.map(...))`
 * whenever the worker does synchronous JS-thread work per item (AEAD
 * decrypt, JSON.parse of a large blob) — an unbounded fan-out over N blobs is
 * one long stall, whereas batching gives navigation a chance to land between
 * chunks. Order is preserved.
 */
export async function mapInBatches<T, R>(
  items: readonly T[],
  batchSize: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const size = Math.max(1, Math.floor(batchSize));
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const batchResults = await Promise.all(
      batch.map((item, offset) => worker(item, i + offset)),
    );
    results.push(...batchResults);
    if (i + size < items.length) {
      await yieldToUI();
    }
  }
  return results;
}
