import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightClock, flightGeometry} from '../src/util/crashmotion.mjs';

test('flight stays continuous across the old chart scale boundaries', () => {
  for (const width of [330, 900, 1500]) {
    for (const boundary of [2 / 1.15, 3 / 1.15, 4 / 1.15, 5 / 1.15, 10 / 1.15]) {
      const before = flightGeometry(width, 560, boundary - .00001);
      const after = flightGeometry(width, 560, boundary + .00001);
      assert.ok(Math.abs(after.end.y - before.end.y) < .02);
      assert.ok(Math.abs(after.angle - before.angle) < .01);
      assert.ok(after.end.y <= before.end.y, 'rocket must keep climbing');
    }
  }
});

test('motion retains sub-cent precision and never rewinds on rounded or delayed ticks', () => {
  const clock = createFlightClock(0);
  let previous = 1;
  for (let time = 16; time < 30000; time += 16) {
    if (time % 160 === 0) {
      const delayed = Math.max(0, time - 130);
      clock.observe(Math.floor(Math.exp(delayed * .00006) * 100) / 100, time);
      clock.observe(1, time); // stale packets cannot drag the clock backward
    }
    const current = clock.sample(time);
    assert.ok(current > previous);
    assert.ok(current / previous < 1.0013, 'server updates cannot teleport the rocket');
    previous = current;
  }
  assert.notEqual(createFlightClock(0).sample(16), 1);
});

test('clock resumes a running round and gently catches up after a late start', () => {
  const clock = createFlightClock(500, 2.2, Math.log(2.2) / .00006);
  assert.ok(Math.abs(clock.sample(500) - 2.2) < 1e-10);
  clock.observe(2.5, 516);
  assert.ok(clock.sample(516) < 2.21);
  assert.ok(clock.sample(5516) > 2.5);
  const fallback = createFlightClock(0, 3, NaN);
  assert.ok(Math.abs(fallback.sample(0) - 3) < 1e-10);
});

test('flight geometry remains finite and the ship stays within the chart', () => {
  for (const width of [330, 900, 1900]) {
    for (const multiplier of [1, 1.001, 2.2, 4.14, 100, 10000]) {
      const g = flightGeometry(width, 350, multiplier);
      assert.ok(Number.isFinite(g.angle));
      assert.ok(g.end.x > 40 && g.end.x < width - 60);
      assert.ok(g.end.y > 40 && g.end.y < 320);
      assert.ok(!/NaN|Infinity/.test(g.path));
    }
  }
});
