export const ROULETTE_NUMBERS = [
  1, 14, 2, 13, 3, 12, 4, 11, 5, 10, 6, 9, 7, 0, 8,
];
export const TILE_PITCH = 85;
export const CYCLE_WIDTH = ROULETTE_NUMBERS.length * TILE_PITCH;
export const numberOffset = (number) =>
  Math.max(0, ROULETTE_NUMBERS.indexOf(number)) * TILE_PITCH + 40;
const clamp = (number) => Math.max(0, Math.min(1, number));
export const timestamp = (value) =>
  typeof value === "number" ? value : new Date(value || 0).getTime();

// Integral of a continuous speed curve: accelerate, cruise, then decelerate.
// Both speed and acceleration meet at every segment boundary.
export function spinEase(progress) {
  const t = clamp(progress),
    acceleration = 0.12,
    cruise = 0.2,
    deceleration = 0.68;
  const integral = (x) => x * x * x - 0.5 * x * x * x * x;
  const distance =
    t < acceleration
      ? acceleration * integral(t / acceleration)
      : t < acceleration + cruise
        ? acceleration / 2 + t - acceleration
        : acceleration / 2 +
          cruise +
          deceleration *
            ((t - acceleration - cruise) / deceleration -
              integral((t - acceleration - cruise) / deceleration));
  return clamp(distance / (acceleration / 2 + cruise + deceleration / 2));
}
export function spinPosition(round, serverNow, duration = 5000) {
  const start = numberOffset(round?.previousResult ?? 0);
  if (!Number.isInteger(round?.result) || !round?.rolledAt) return start;
  const target = numberOffset(round.result);
  const distance =
    4 * CYCLE_WIDTH + ((target - start + CYCLE_WIDTH) % CYCLE_WIDTH);
  const progress = clamp(
    (serverNow - timestamp(round.rolledAt)) / Math.max(1, duration),
  );
  return start + distance * spinEase(progress);
}
export function visualOffset(position) {
  return (
    (((position % CYCLE_WIDTH) + CYCLE_WIDTH) % CYCLE_WIDTH) + 2 * CYCLE_WIDTH
  );
}

export function createRouletteTimeline() {
  let latest = null,
    serverAnchor = 0,
    localAnchor = 0;
  return {
    accept(data, receivedAt) {
      if (!data?.round?.id || !Number.isFinite(timestamp(data.serverTime)))
        return false;
      if (latest) {
        if (BigInt(data.round.id) < BigInt(latest.round.id)) return false;
        if (String(data.round.id) === String(latest.round.id)) {
          if (timestamp(data.serverTime) < timestamp(latest.serverTime))
            return false;
          if (
            latest.round.rolledAt &&
            !data.round.rolledAt &&
            data.round.status !== "cancelled"
          )
            return false;
          if (
            latest.round.result != null &&
            data.round.result != null &&
            latest.round.result !== data.round.result
          )
            return false;
          if (latest.round.endedAt && !data.round.endedAt) return false;
        }
      }
      const predicted = serverAnchor + (receivedAt - localAnchor);
      const incoming = timestamp(data.serverTime);
      // Never rewind a live spin when a delayed snapshot arrives.
      serverAnchor =
        latest && String(latest.round.id) === String(data.round.id)
          ? Math.max(predicted, incoming)
          : incoming;
      localAnchor = receivedAt;
      latest = data;
      return true;
    },
    now(localNow) {
      return serverAnchor + (localNow - localAnchor);
    },
    snapshot() {
      return latest;
    },
  };
}
