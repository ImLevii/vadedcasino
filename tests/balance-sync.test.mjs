import test from "node:test";
import assert from "node:assert/strict";
import { createBalanceSync } from "../src/util/balance-sync.mjs";
test("replayed balance deltas coalesce into authoritative reads and never add money twice", async () => {
  const tasks = [];
  let release,
    calls = 0;
  const values = [];
  const sync = createBalanceSync(
    () => {
      calls++;
      return new Promise((r) => (release = r));
    },
    (v) => values.push(v.balance),
    {
      schedule: (fn) => {
        tasks.push(fn);
        return tasks.length;
      },
      cancel: () => {},
    },
  );
  for (let i = 0; i < 100; i++) sync.request("add", 10);
  assert.equal(tasks.length, 1);
  const first = tasks.shift()();
  sync.request("add", 10);
  release({ balance: 50 });
  await first;
  assert.deepEqual(values, [50]);
  const second = tasks.shift()();
  release({ balance: 50 });
  await second;
  assert.deepEqual(values, [50, 50]);
  assert.equal(calls, 2);
  sync.request();
  const late = tasks.shift()();
  sync.dispose();
  release({ balance: 999 });
  await late;
  assert.deepEqual(values, [50, 50]);
});
