// Financial events invalidate a cached balance. Replayed deltas never change it.
export function createBalanceSync(
  read,
  apply,
  { schedule = setTimeout, cancel = clearTimeout } = {},
) {
  let timer,
    pending = false,
    dirty = false,
    stopped = false;
  async function refresh() {
    timer = null;
    if (stopped || pending) return;
    pending = true;
    dirty = false;
    try {
      const snapshot = await read();
      if (!stopped && snapshot && Number.isFinite(Number(snapshot.balance)))
        apply(snapshot);
    } finally {
      pending = false;
      if (dirty && !stopped) timer = schedule(refresh, 80);
    }
  }
  return {
    request() {
      if (stopped) return;
      dirty = true;
      if (!pending && !timer) timer = schedule(refresh, 80);
    },
    dispose() {
      stopped = true;
      cancel(timer);
    },
  };
}
