const { sql, doTransaction } = require("../../../database");
const { newBets } = require("../../../socketio/bets");
const { roundDecimal } = require("../../../utils");
const { sha256, generateServerSeed } = require("../../../fairness");
const { getGameConfig } = require("../../admin/gameConfig");
const {
  getControl,
  roundRules,
  health,
} = require("../../../runtime/game-controls");
const io = require("../../../socketio/server");
const crypto = require("node:crypto");
const ms = (value) => new Date(value).valueOf();
const defaults = () =>
  Object.fromEntries(
    Object.entries({
      betTime: 10000,
      tickRate: 150,
      maxProfit: 1000000,
      maxPayout: 50000,
      minBet: 0.1,
      maxBet: 25000,
      bonusPotRake: 1,
      houseEdge: 4,
    }).map(([key, value]) => [key, Number(getGameConfig("crash", key, value))]),
  );
const crash = {
  round: { id: null },
  bets: [],
  last: [],
  pot: 0,
  intervalStarted: false,
};
Object.defineProperty(crash, "config", {
  get: () => ({ ...defaults(), ...crash.round.rules }),
});
const growthFunc = (elapsed) =>
  Math.floor(100 * Math.exp(0.00006 * elapsed)) / 100;
function computeCrashPoint(seed) {
  const edge = defaults().houseEdge / 100,
    h = parseInt(
      crypto.createHash("sha256").update(seed).digest("hex").slice(0, 8),
      16,
    );
  if (h % Math.max(2, Math.round(25 * (edge / 0.04))) === 0) return 1;
  return Math.max(1, Math.floor((2 ** 32 / (h + 1)) * (1 - edge) * 100) / 100);
}
function capWinnings(amount, multiplier, rules = crash.config) {
  return Math.min(
    roundDecimal(amount * multiplier),
    roundDecimal(Number(amount) + rules.maxProfit),
    rules.maxPayout,
  );
}
async function addToPot(amount, connection = sql) {
  const [[pot]] = await connection.query(
    "SELECT value FROM settings WHERE id = ? FOR UPDATE",
    ["crashBonusPot"],
  );
  crash.pot = roundDecimal(
    Number(pot?.value || 0) + (amount * crash.config.bonusPotRake) / 100,
  );
  await connection.query(
    "INSERT INTO settings (id, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    ["crashBonusPot", String(crash.pot)],
  );
  io.to("crash").emit("crash:pot", crash.pot);
}
async function advanceCrash() {
  const finished = [];
  await doTransaction(async (connection, commit) => {
    await connection.query(
      "SELECT gameId FROM gameOperationControls WHERE game = ? AND gameId = 0 FOR UPDATE",
      ["crash"],
    );
    const global = await getControl(connection, "crash", 0);
    const [[latest]] = await connection.query(
      "SELECT * FROM crash ORDER BY id DESC LIMIT 1 FOR UPDATE",
    );
    const now = Date.now();
    let round = latest;
    if (!round || (round.endedAt && now >= ms(round.endedAt) + 4000)) {
      if (global.locked || global.pausedAt) {
        await commit();
        return;
      }
      const seed = generateServerSeed();
      const [insert] = await connection.query(
        "INSERT INTO crash (serverSeed, crashPoint, createdAt) VALUES (?, ?, NOW())",
        [seed, computeCrashPoint(seed)],
      );
      [[round]] = await connection.query("SELECT * FROM crash WHERE id = ?", [
        insert.insertId,
      ]);
      io.to("crash").emit("crash:new", {
        id: round.id,
        serverSeedHash: sha256(seed),
        createdAt: round.createdAt,
        betTime: defaults().betTime,
      });
    }
    round.rules = await roundRules(connection, "crash", round.id, defaults());
    const control = await getControl(connection, "crash", round.id);
    crash.round = {
      ...round,
      control: { ...control, locked: control.locked || global.locked },
      serverSeedHash: sha256(round.serverSeed),
    };
    const [[pot]] = await connection.query(
      "SELECT value FROM settings WHERE id = ?",
      ["crashBonusPot"],
    );
    crash.pot = Number(pot?.value || 0);
    const [rows] = await connection.query(
      "SELECT cb.*, u.username, u.role, u.xp, u.anon FROM crashBets cb JOIN users u ON u.id = cb.userId WHERE cb.roundId = ?",
      [round.id],
    );
    crash.bets = rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      cashoutPoint: r.cashoutPoint,
      autoCashoutPoint: r.autoCashoutPoint,
      user: {
        id: r.userId,
        username: r.username,
        role: r.role,
        xp: r.xp,
        anon: r.anon,
      },
    }));
    if (!round.endedAt && !control.cancelledAt && !control.pausedAt) {
      const start = round.startedAt
        ? ms(round.startedAt)
        : ms(round.createdAt) + round.rules.betTime;
      if (now >= start) {
        if (!round.startedAt) {
          round.startedAt = new Date(start);
          await connection.query(
            "UPDATE crash SET startedAt = ? WHERE id = ?",
            [round.startedAt, round.id],
          );
          io.to("crash").emit("crash:start", {
            id: round.id,
            startedAt: round.startedAt,
          });
        }
        const end =
          start + Math.ceil(Math.log(Number(round.crashPoint)) / 0.00006);
        const multiplier =
          now >= end
            ? Number(round.crashPoint)
            : Math.min(growthFunc(now - start), Number(round.crashPoint));
        Object.assign(crash.round, {
          startedAt: round.startedAt,
          currentMultiplier: multiplier,
        });
        for (const bet of crash.bets) {
          if (
            bet.cashoutPoint ||
            !bet.autoCashoutPoint ||
            bet.autoCashoutPoint > multiplier
          )
            continue;
          const [[ledger]] = await connection.query(
            "SELECT id, completed FROM bets WHERE game = ? AND gameId = ? FOR UPDATE",
            ["crash", bet.id],
          );
          if (!ledger || ledger.completed) continue;
          const winnings = capWinnings(
            bet.amount,
            bet.autoCashoutPoint,
            round.rules,
          );
          await connection.query(
            "UPDATE crashBets SET cashoutPoint = ? WHERE id = ?",
            [bet.autoCashoutPoint, bet.id],
          );
          await connection.query(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            [winnings, bet.user.id],
          );
          await connection.query(
            "UPDATE bets SET completed = 1, winnings = ? WHERE id = ?",
            [winnings, ledger.id],
          );
          Object.assign(bet, { cashoutPoint: bet.autoCashoutPoint, winnings });
          io.to(bet.user.id).emit("balance", "add", winnings);
          io.to("crash").emit("crash:cashout", {
            id: bet.id,
            cashoutPoint: bet.cashoutPoint,
            winnings,
          });
          finished.push({
            user: bet.user,
            amount: bet.amount,
            edge: roundDecimal(bet.amount * 0.075),
            payout: winnings,
            game: "crash",
          });
        }
        io.to("crash").emit("crash:tick", multiplier);
        if (now >= end) {
          crash.round.endedAt = new Date(end);
          await connection.query("UPDATE crash SET endedAt = ? WHERE id = ?", [
            crash.round.endedAt,
            round.id,
          ]);
          if (rows.length)
            await connection.query(
              "UPDATE bets SET completed = 1 WHERE game = ? AND gameId IN (?)",
              ["crash", rows.map((r) => r.id)],
            );
          finished.push(
            ...crash.bets
              .filter((b) => !b.cashoutPoint)
              .map((b) => ({
                user: b.user,
                amount: b.amount,
                edge: roundDecimal(b.amount * 0.075),
                payout: 0,
                game: "crash",
              })),
          );
          const winner = crash.bets
            .filter((b) => b.cashoutPoint >= 5)
            .sort((a, b) => b.cashoutPoint - a.cashoutPoint)[0];
          if (winner && crash.pot > 0) {
            const amount = crash.pot;
            await connection.query(
              "UPDATE users SET balance = balance + ? WHERE id = ?",
              [amount, winner.user.id],
            );
            await connection.query(
              "UPDATE settings SET value = ? WHERE id = ?",
              ["0", "crashBonusPot"],
            );
            crash.pot = 0;
            io.to(winner.user.id).emit("balance", "add", amount);
            io.to("crash").emit("crash:pot:won", {
              user: winner.user.anon
                ? null
                : { id: winner.user.id, username: winner.user.username },
              amount,
              cashoutPoint: winner.cashoutPoint,
            });
            io.to("crash").emit("crash:pot", 0);
          }
          io.to("crash").emit("crash:end", {
            id: round.id,
            crashPoint: Number(round.crashPoint),
            serverSeed: round.serverSeed,
          });
        }
      }
    }
    const [last] = await connection.query(
      "SELECT g.crashPoint FROM crash g WHERE g.endedAt IS NOT NULL AND NOT EXISTS (SELECT 1 FROM gameOperationControls c WHERE c.game = 'crash' AND c.gameId = g.id AND c.cancelledAt IS NOT NULL) ORDER BY g.id DESC LIMIT 30",
    );
    crash.last = last.map((r) => Number(r.crashPoint));
    await health(connection, "crash");
    await commit();
  });
  if (finished.length) await newBets(finished);
}
async function cacheCrash() {
  await advanceCrash();
  if (!require("../../../runtime/context").enabled && !crash.intervalStarted) {
    crash.intervalStarted = true;
    const tick = async () => {
      try {
        await advanceCrash();
      } catch (error) {
        console.error("[crash]", error.code || "ADVANCEMENT_FAILED");
        await health(sql, "crash", error).catch(() => {});
      } finally {
        setTimeout(tick, Math.max(100, crash.config.tickRate)).unref?.();
      }
    };
    setTimeout(tick, 150).unref?.();
  }
}
module.exports = {
  cacheCrash,
  crash,
  capWinnings,
  addToPot: require("../../../runtime/context").tracked(addToPot),
};
