const { sql, doTransaction } = require("../../../database");
const { newBets } = require("../../../socketio/bets");
const { roundDecimal } = require("../../../utils");
const { getGameConfig } = require("../../admin/gameConfig");
const { generateServerSeed } = require("../../../fairness");
const io = require("../../../socketio/server");
const crypto = require("node:crypto");
const {
  addContribution,
  distributeBonus,
  loadBonus,
  MINIMUM_BET,
} = require("./bonus");
const controls = require("../../../runtime/game-controls");

function getColorsMultipliers() {
  const configured =
    getGameConfig("roulette", "colorsMultipliers", {
      0: 14,
      1: 2,
      2: 2,
      3: 7,
    }) || {};
  return {
    0: 14,
    1: Number(configured[1]) > 0 ? Number(configured[1]) : 2,
    2: Number(configured[2]) > 0 ? Number(configured[2]) : 2,
    3: 7,
  };
}
function resultToColor(result) {
  return result === 0 ? 0 : result <= 7 ? 1 : 2;
}
function betWins(color, result, resultColor) {
  return (
    color === resultColor || (color === 3 && (result === 7 || result === 8))
  );
}
function getTripleGreenBonusRake() {
  const value = Number(getGameConfig("roulette", "tripleGreenBonusRake", 0.66));
  return Number.isFinite(value) && value >= 0 && value <= 5 ? value : 0.66;
}
const roulette = {
  round: {},
  bets: [],
  last: [],
  tripleGreenBonusPot: 0,
  tripleGreenStreak: 0,
  config: {
    betTime: 10000,
    rollTime: 5000,
    maxBet: 25000,
    tripleGreenMinimumBet: MINIMUM_BET,
    tripleGreenBonusRake: 0.66,
  },
};
const timestamp = (value) => (value ? new Date(value).valueOf() : 0);

async function settleRouletteBets(connection, round, bets) {
  const multipliers = round.rules?.multipliers || getColorsMultipliers();
  const settled = [];
  for (const bet of bets) {
    const [[ledger]] = await connection.query(
      "SELECT id, completed FROM bets WHERE game = ? AND gameId = ? FOR UPDATE",
      ["roulette", bet.id],
    );
    if (!ledger || ledger.completed) continue;
    const payout = betWins(bet.color, round.result, round.color)
      ? roundDecimal(bet.amount * multipliers[bet.color])
      : 0;
    if (payout > 0)
      await connection.query(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        [payout, bet.user.id],
      );
    await connection.query(
      "UPDATE bets SET completed = 1, winnings = ? WHERE id = ?",
      [payout, ledger.id],
    );
    settled.push({
      user: bet.user,
      amount: bet.amount,
      edge: roundDecimal(bet.amount * 0.05),
      payout,
      game: "roulette",
    });
  }
  return settled;
}
async function addToTripleGreenBonus(connection, amount) {
  return addContribution(
    connection,
    amount,
    roulette.round.rules?.tripleGreenBonusRake ?? getTripleGreenBonusRake(),
  );
}
function snapshot() {
  const r = roulette.round;
  const rolled = !!r.rolledAt && !r.control?.cancelledAt;
  return {
    serverTime: Date.now(),
    config: roulette.config,
    bets: roulette.bets,
    last: roulette.last,
    tripleGreenBonusPot: roulette.tripleGreenBonusPot,
    tripleGreenStreak: roulette.tripleGreenStreak,
    round: {
      id: r.id,
      createdAt: r.createdAt,
      rolledAt: r.rolledAt,
      endedAt: r.endedAt,
      result: rolled ? r.result : null,
      color: rolled ? r.color : null,
      serverSeedHash: r.serverSeed
        ? crypto.createHash("sha256").update(r.serverSeed).digest("hex")
        : null,
      previousResult: r.previousResult ?? 0,
      bettingClosesAt: timestamp(r.createdAt) + roulette.config.betTime,
      animationEndsAt: rolled
        ? timestamp(r.rolledAt) + roulette.config.rollTime
        : null,
      controlRevision: r.control?.revision || 0,
      pausedAt: r.control?.pausedAt,
      status: r.control?.cancelledAt
        ? "cancelled"
        : r.endedAt
          ? "ended"
          : r.control?.pausedAt
            ? "paused"
            : rolled
              ? "rolling"
              : "created",
      phase: r.control?.cancelledAt
        ? "CANCELLED"
        : r.endedAt
          ? "ROUND_COMPLETE"
          : r.control?.pausedAt
            ? "PAUSED"
            : rolled
              ? "SPINNING"
              : r.control?.locked
                ? "BETTING_LOCKED"
                : "BETTING",
    },
  };
}
async function advanceRoulette() {
  let publicBets = [];
  await doTransaction(async (connection, commit) => {
    await connection.query(
      "SELECT gameId FROM gameOperationControls WHERE game = ? AND gameId = 0 FOR UPDATE",
      ["roulette"],
    );
    let [[round]] = await connection.query(
      "SELECT * FROM roulette ORDER BY id DESC LIMIT 1 FOR UPDATE",
    );
    const now = Date.now();
    const global = await controls.getControl(connection, "roulette", 0);
    if (!round || (round.endedAt && now >= timestamp(round.endedAt) + 2500)) {
      if (!global.pausedAt && !global.locked) {
        const serverSeed = generateServerSeed();
        const result =
          parseInt(
            crypto
              .createHash("sha256")
              .update(serverSeed)
              .digest("hex")
              .slice(0, 8),
            16,
          ) % 15;
        const [insert] = await connection.query(
          "INSERT INTO roulette (result, color, serverSeed) VALUES (?, ?, ?)",
          [result, resultToColor(result), serverSeed],
        );
        [[round]] = await connection.query(
          "SELECT * FROM roulette WHERE id = ?",
          [insert.insertId],
        );
      }
    }
    if (!round) {
      await commit();
      return;
    }
    const rules = await controls.roundRules(connection, "roulette", round.id, {
      betTime: Number(getGameConfig("roulette", "betTime", 10000)),
      rollTime: Number(getGameConfig("roulette", "rollTime", 5000)),
      maxBet: Number(getGameConfig("roulette", "maxBet", 25000)),
      multipliers: getColorsMultipliers(),
      tripleGreenBonusRake: getTripleGreenBonusRake(),
    });
    round.rules = rules;
    roulette.config = { ...roulette.config, ...rules };
    round.control = await controls.getControl(connection, "roulette", round.id);
    round.control = {
      ...round.control,
      locked: round.control.locked || global.locked,
    };
    const [rows] = await connection.query(
      "SELECT rb.*, u.username, u.xp, u.anon FROM rouletteBets rb JOIN users u ON u.id = rb.userId WHERE rb.roundId = ?",
      [round.id],
    );
    roulette.bets = rows.map((row) => ({
      id: row.id,
      color: row.color,
      amount: row.amount,
      user: {
        id: row.userId,
        username: row.username,
        xp: row.xp,
        anon: row.anon,
      },
    }));
    if (
      !round.endedAt &&
      !round.control.cancelledAt &&
      !round.control.pausedAt
    ) {
      const roll = round.rolledAt
        ? timestamp(round.rolledAt)
        : timestamp(round.createdAt) + rules.betTime;
      if (now >= roll && !round.rolledAt) {
        round.rolledAt = new Date(roll);
        await connection.query(
          "UPDATE roulette SET rolledAt = ? WHERE id = ? AND rolledAt IS NULL",
          [round.rolledAt, round.id],
        );
        io.to("roulette").emit("roulette:roll", {
          id: round.id,
          result: round.result,
          color: round.color,
          rolledAt: round.rolledAt,
          serverTime: now,
          rollTime: rules.rollTime,
        });
      }
      if (round.rolledAt && now >= roll + rules.rollTime) {
        const settled = await settleRouletteBets(
          connection,
          round,
          roulette.bets,
        );
        round.endedAt = new Date(roll + rules.rollTime);
        await connection.query(
          "UPDATE roulette SET endedAt = ? WHERE id = ? AND endedAt IS NULL",
          [round.endedAt, round.id],
        );
        const bonus = await distributeBonus(connection);
        for (const bet of settled)
          if (bet.payout)
            io.to(String(bet.user.id)).emit("balance", "add", bet.payout);
        publicBets = settled;
        if (bonus) {
          for (const payout of bonus.payouts)
            io.to(String(payout.userId)).emit("balance", "add", payout.amount);
          io.to("roulette").emit("roulette:tripleGreenBonus:won", {
            ...bonus,
            eventId: "roulette-bonus:" + round.id,
          });
        }
      }
    }
    const [last] = await connection.query(
      "SELECT r.result, r.id FROM roulette r LEFT JOIN gameOperationControls c ON c.game = ? AND c.gameId = r.id WHERE r.endedAt IS NOT NULL AND c.cancelledAt IS NULL ORDER BY r.id DESC LIMIT 100",
      ["roulette"],
    );
    roulette.last = last.map((r) => r.result);
    round.previousResult =
      last.find((r) => String(r.id) !== String(round.id))?.result ?? 0;
    roulette.round = round;
    const bonus = await loadBonus(connection);
    roulette.tripleGreenBonusPot = bonus.pot;
    roulette.tripleGreenStreak = bonus.streak;
    await controls.health(connection, "roulette");
    await commit();
  });
  if (publicBets.length) await newBets(publicBets);
  io.to("roulette").emit("roulette:state", snapshot());
}
let timer;
async function cacheRoulette() {
  await advanceRoulette();
  if (!require("../../../runtime/context").enabled && !timer) {
    const tick = async () => {
      try {
        await advanceRoulette();
      } catch (error) {
        console.error("[roulette]", error.code || "ADVANCEMENT_FAILED");
        await controls.health(sql, "roulette", error).catch(() => {});
      }
      timer = setTimeout(tick, 200);
      timer.unref?.();
    };
    timer = setTimeout(tick, 200);
    timer.unref?.();
  }
}
module.exports = {
  settleRouletteBets,
  roulette,
  resultToColor,
  betWins,
  getColorsMultipliers,
  cacheRoulette,
  addToTripleGreenBonus,
  snapshot,
};
