// Tracks fire-and-forget work (feed events, achievements, notifications) that
// outlives the request. Lets tests wait for it before resetting the database.

const pending = new Set<Promise<unknown>>();

export function trackBackground<T>(promise: Promise<T>): Promise<T> {
  pending.add(promise);
  const remove = (): void => {
    pending.delete(promise);
  };
  promise.then(remove, remove);
  return promise;
}

/** Resolves once all tracked work, including work spawned while waiting, has settled. */
export async function drainBackground(): Promise<void> {
  while (pending.size > 0) {
    await Promise.allSettled([...pending]);
  }
}
