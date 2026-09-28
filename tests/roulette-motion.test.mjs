import test from "node:test";
import assert from "node:assert/strict";
import {
  ROULETTE_NUMBERS,
  CYCLE_WIDTH,
  numberOffset,
  spinEase,
  spinPosition,
  visualOffset,
  createRouletteTimeline,
} from "../src/util/roulette-motion.mjs";

test("all 225 roulette transitions land on the authoritative number at every supported frame rate", () => {
  for (const previousResult of ROULETTE_NUMBERS)
    for (const result of ROULETTE_NUMBERS) {
      const round = { id: 42, previousResult, result, rolledAt: 100000 };
      for (const hz of [30, 60, 120, 144]) {
        let last = spinPosition(round, 100000, 5000);
        for (let t = 0; t < 5000; t += 1000 / hz) {
          const next = spinPosition(round, 100000 + t, 5000);
          assert.ok(next >= last - 1e-9);
          last = next;
        }
        const end = spinPosition(round, 105000, 5000);
        assert.ok(Math.abs((end % CYCLE_WIDTH) - numberOffset(result)) < 1e-7);
        assert.equal(spinPosition(round, 110000, 5000), end);
        assert.ok(
          visualOffset(end) >= CYCLE_WIDTH * 2 &&
            visualOffset(end) < CYCLE_WIDTH * 3,
        );
      }
    }
});
test("roulette speed is continuous at acceleration, cruise and deceleration boundaries", () => {
  assert.equal(spinEase(0), 0);
  assert.equal(spinEase(1), 1);
  const h = 1e-6;
  for (const t of [0.12, 0.32])
    assert.ok(
      Math.abs(
        (spinEase(t) - spinEase(t - h)) / h -
          (spinEase(t + h) - spinEase(t)) / h,
      ) < 0.001,
    );
  assert.ok(spinEase(h) / h < 0.001);
  assert.ok((1 - spinEase(1 - h)) / h < 0.001);
});
test("mid-spin refresh, duplicate snapshots, delayed events and reconnect preserve round identity", () => {
  const timeline = createRouletteTimeline();
  const initial = {
    serverTime: 102000,
    round: { id: 42, result: 7, previousResult: 0, rolledAt: 100000 },
  };
  assert.equal(timeline.accept(initial, 500), true);
  const position = spinPosition(
    timeline.snapshot().round,
    timeline.now(500),
    5000,
  );
  assert.ok(position > numberOffset(0));
  assert.ok(position < spinPosition(initial.round, 105000, 5000));
  assert.equal(timeline.accept({ ...initial, serverTime: 101000 }, 600), false);
  assert.equal(
    timeline.accept({ ...initial, round: { ...initial.round, id: 41 } }, 600),
    false,
  );
  assert.equal(
    timeline.accept(
      { ...initial, round: { ...initial.round, result: 8 } },
      600,
    ),
    false,
  );
  assert.equal(
    timeline.accept(
      { ...initial, round: { ...initial.round, rolledAt: null } },
      600,
    ),
    false,
  );
  assert.equal(timeline.accept(initial, 900), true);
  assert.equal(timeline.now(900), 102400);
  assert.equal(
    timeline.accept(
      {
        ...initial,
        serverTime: 106000,
        round: { ...initial.round, endedAt: 105000 },
      },
      4500,
    ),
    true,
  );
  assert.equal(
    timeline.accept({ ...initial, serverTime: 106001 }, 4501),
    false,
  );
  assert.ok(
    Math.abs(
      (spinPosition(initial.round, timeline.now(4500), 5000) % CYCLE_WIDTH) -
        numberOffset(7),
    ) < 1e-7,
  );
});
