const { sql, doTransaction } = require("../../database");
const { storage, enabled } = require("../../runtime/context");
const { can } = require("./access");
const {
  definition,
  ledgerSource,
  getGame,
  detail,
  error,
  ms,
  json,
} = require("./operations-read");
const { getControl } = require("../../runtime/game-controls");
const io = require("../../socketio/server");

const permission = {
  pause: "games.pause",
  resume: "games.pause",
  lock: "games.manage",
  unlock: "games.manage",
  close_betting: "games.manage",
  cancel_refund: "games.refund",
  cashout: "games.manage",
  recover: "games.recover",
};
function actions(info, user) {
  if (info.id === 0) if (["slots", "blackjack"].includes(info.game)) return [];
  if (info.id === 0)
    return ["lock", "unlock"].filter((action) => can(user, permission[action]));
  if (
    ["COMPLETED", "CANCELLED"].includes(info.state) ||
    ["cases", "slots"].includes(info.game)
  )
    return [];
  let available = [];
  if (["WAITING", "BETTING", "LOCKED", "PAUSED"].includes(info.state))
    available = ["pause", "resume", "lock", "unlock", "cancel_refund"];
  if (["mines", "blackjack"].includes(info.game))
    available =
      info.game === "blackjack"
        ? ["cancel_refund"]
        : ["pause", "resume", "cancel_refund", "cashout"];
  if (["roulette", "crash"].includes(info.game) && !info.startedAt)
    available.push("close_betting");
  if (
    enabled &&
    ["roulette", "crash", "battles", "coinflip"].includes(info.game)
  )
    available.push("recover");
  return [...new Set(available)].filter(
    (action) =>
      can(user, permission[action]) &&
      (action !== "pause" || info.state !== "PAUSED") &&
      (action !== "resume" || info.state === "PAUSED") &&
      (action !== "lock" || !info.locked) &&
      (action !== "unlock" || info.locked),
  );
}
async function audit(
  connection,
  actor,
  request,
  before,
  after,
  success,
  errorCode = null,
) {
  await connection.query(
    "INSERT INTO gameOperationAudit (requestId, adminId, game, gameId, action, stateBefore, stateAfter, parameters, success, errorCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      request.requestId,
      actor.id,
      request.game,
      request.id,
      request.action,
      JSON.stringify(before),
      JSON.stringify(after),
      JSON.stringify({
        reason: request.reason,
        expectedVersion: request.version,
        ...(request.valuesHash ? { valuesHash: request.valuesHash } : {}),
      }),
      success ? 1 : 0,
      errorCode,
    ],
  );
}
async function refund(connection, game, id, raw, requestId) {
  const [ledger] = await connection.query(
    `SELECT b.* FROM (${ledgerSource(game)}) b WHERE b.roundId = ? ORDER BY b.id`,
    [id],
  );
  if (ledger.some((b) => b.completed || b.winnings > 0))
    throw error("PAYOUT_ALREADY_STARTED", 409);
  if (game === "mines" && json(raw.revealedTiles).length)
    throw error("USE_SAFE_CASHOUT", 409);
  const credits = [];
  for (const bet of ledger) {
    const [[locked]] = await connection.query(
      "SELECT id, completed, amount FROM bets WHERE id = ? FOR UPDATE",
      [bet.id],
    );
    if (!locked || locked.completed) throw error("PAYOUT_ALREADY_STARTED", 409);
    const [[player]] = await connection.query(
      "SELECT id, role FROM users WHERE id = ? FOR UPDATE",
      [bet.userId],
    );
    const amount = Number(bet.amount);
    if (player?.role !== "BOT") {
      await connection.query(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        [amount, bet.userId],
      );
      await connection.query(
        "INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)",
        [bet.userId, amount, "in", "admin-game-refund", bet.id],
      );
      credits.push({ userId: bet.userId, amount });
    }
    await connection.query(
      "UPDATE bets SET completed = 1, winnings = ?, edge = 0 WHERE id = ?",
      [amount, bet.id],
    );
  }
  const d = definition(game);
  if (game !== "coinflip")
    await connection.query(
      `UPDATE ${d.table} SET endedAt = NOW()${["mines", "blackjack"].includes(game) ? ", payout = amount" : ""} WHERE id = ?`,
      [id],
    );
  await connection.query(
    "UPDATE gameOperationControls SET cancelledAt = NOW(), pausedAt = NULL, locked = 1 WHERE game = ? AND gameId = ?",
    [game, id],
  );
  // Pot contributions are house-funded; remove this unplayed round's funding.
  if (["roulette", "crash"].includes(game)) {
    const [[stored]] = await connection.query(
      "SELECT config FROM gameRoundRules WHERE game = ? AND gameId = ?",
      [game, id],
    );
    const rules = json(stored?.config, {}),
      rate =
        game === "roulette"
          ? (rules.tripleGreenBonusRake ?? 0.66)
          : (rules.bonusPotRake ?? 1);
    const key =
      game === "roulette" ? "rouletteTripleGreenBonusPot" : "crashBonusPot";
    const [[pot]] = await connection.query(
      "SELECT value FROM settings WHERE id = ? FOR UPDATE",
      [key],
    );
    if (pot) {
      const funding = ledger.reduce(
        (sum, b) =>
          sum +
          (game === "roulette"
            ? (Math.round(Number(b.amount) * 100) * Math.round(rate * 100)) /
              1000000
            : Math.floor(Number(b.amount) * rate) / 100),
        0,
      );
      await connection.query("UPDATE settings SET value = ? WHERE id = ?", [
        String(Math.max(0, Number(pot.value) - funding)),
        key,
      ]);
    }
  }
  return credits;
}
async function safeCashout(connection, raw) {
  const selected = json(raw.revealedTiles);
  if (!selected.length) throw error("NO_REVEALED_TILES", 409);
  if (selected.some((tile) => json(raw.mines).includes(tile)))
    throw error("GAME_ALREADY_LOST", 409);
  const [[bet]] = await connection.query(
    "SELECT id, completed FROM bets WHERE game = ? AND gameId = ? FOR UPDATE",
    ["mines", raw.id],
  );
  if (!bet || bet.completed) throw error("PAYOUT_ALREADY_STARTED", 409);
  const multiplier = require("../games/mines/functions").calculateMultiplier(
    raw.minesCount,
    selected.length,
  );
  const payout = require("../../utils").roundDecimal(
    Number(raw.amount) * multiplier,
  );
  await connection.query(
    "UPDATE mines SET endedAt = NOW(), payout = ? WHERE id = ?",
    [payout, raw.id],
  );
  await connection.query(
    "UPDATE bets SET completed = 1, winnings = ? WHERE id = ?",
    [payout, bet.id],
  );
  await connection.query(
    "UPDATE users SET balance = balance + ? WHERE id = ?",
    [payout, raw.userId],
  );
  await connection.query(
    "INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)",
    [raw.userId, payout, "in", "admin-mines-cashout", bet.id],
  );
  return [{ userId: raw.userId, amount: payout }];
}
async function perform(actor, body) {
  const request = {
    game: String(body.game || ""),
    id: Number(body.id),
    action: String(body.action || ""),
    reason: String(body.reason || "").trim(),
    requestId: String(body.requestId || ""),
    version: String(body.version || ""),
  };
  definition(request.game);
  if (
    !Number.isSafeInteger(request.id) ||
    request.id < 0 ||
    !/^[a-zA-Z0-9-]{16,64}$/.test(request.requestId) ||
    request.reason.length < 5 ||
    request.reason.length > 500 ||
    !Object.hasOwn(permission, request.action)
  )
    throw error("INVALID_ACTION_REQUEST");
  const context = storage.getStore(),
    previousError = context?.error;
  const transaction = context ? context.transaction : doTransaction;
  let before = null,
    credits = [];
  const result = await transaction(async (connection, commit, rollback) => {
    try {
      await connection.query(
        "SELECT gameId FROM gameOperationControls WHERE game = ? AND gameId = 0 FOR UPDATE",
        [request.game],
      );
      const [[prior]] = await connection.query(
        "SELECT * FROM gameOperationAudit WHERE requestId = ?",
        [request.requestId],
      );
      if (prior) {
        if (
          String(prior.adminId) !== String(actor.id) ||
          prior.game !== request.game ||
          Number(prior.gameId) !== request.id ||
          prior.action !== request.action ||
          json(prior.parameters, {}).reason !== request.reason ||
          json(prior.parameters, {}).expectedVersion !== request.version
        ) {
          await commit();
          return { error: "IDEMPOTENCY_CONFLICT", status: 409 };
        }
        if (!can(actor, permission[request.action])) {
          await commit();
          return { error: "FORBIDDEN", status: 403 };
        }
        await commit();
        return prior.success
          ? { success: true, replayed: true, data: json(prior.stateAfter, {}) }
          : { error: prior.errorCode, status: 409, replayed: true };
      }
      if (!can(actor, permission[request.action]))
        throw error("FORBIDDEN", 403);
      const d = definition(request.game);
      let raw;
      if (request.id) {
        [[raw]] = await connection.query(
          `SELECT * FROM ${d.table} WHERE id = ? FOR UPDATE`,
          [request.id],
        );
        if (!raw) throw error("GAME_NOT_FOUND", 404);
        before = await getGame(connection, request.game, request.id);
      } else {
        const c = await getControl(connection, request.game, 0);
        before = {
          game: request.game,
          id: 0,
          state: c.locked ? "LOCKED" : "OPEN",
          locked: c.locked,
          version: String(c.revision),
        };
      }
      if (before.version !== request.version)
        throw error("STALE_GAME_STATE", 409);
      if (!actions(before, actor).includes(request.action))
        throw error("ACTION_NOT_AVAILABLE", 409);
      if (request.action === "cancel_refund" && !can(actor, "games.cancel"))
        throw error("FORBIDDEN", 403);
      if (
        request.id &&
        ["crash", "roulette"].includes(request.game) &&
        ["pause", "cancel_refund", "close_betting"].includes(request.action) &&
        !before.startedAt &&
        before.state !== "PAUSED"
      ) {
        const [[stored]] = await connection.query(
          "SELECT config FROM gameRoundRules WHERE game = ? AND gameId = ?",
          [request.game, request.id],
        );
        const betTime = json(stored?.config, {}).betTime || 10000;
        if (Date.now() >= ms(raw.createdAt) + betTime)
          throw error("ROUND_ADVANCEMENT_REQUIRED", 409);
      }
      if (
        ["pause", "cancel_refund", "close_betting"].includes(request.action) &&
        ["crash", "roulette"].includes(request.game) &&
        before.startedAt
      )
        throw error("ROUND_ALREADY_RUNNING", 409);
      if (
        request.id &&
        request.game === "battles" &&
        request.action !== "recover" &&
        (raw.startedAt || raw.clientSeed || raw.EOSBlock)
      )
        throw error("ROUND_ALREADY_COMMITTED", 409);
      if (
        request.id &&
        request.game === "coinflip" &&
        request.action !== "recover" &&
        raw.fire &&
        raw.ice
      )
        throw error("ROUND_ALREADY_COMMITTED", 409);
      await connection.query(
        "INSERT IGNORE INTO gameOperationControls (game, gameId) VALUES (?, ?)",
        [request.game, request.id],
      );
      if (request.action === "pause")
        await connection.query(
          "UPDATE gameOperationControls SET pausedAt = NOW() WHERE game = ? AND gameId = ?",
          [request.game, request.id],
        );
      if (request.action === "resume") {
        const control = await getControl(connection, request.game, request.id);
        if (control.pausedAt && ["crash", "roulette"].includes(request.game))
          await connection.query(
            `UPDATE ${d.table} SET createdAt = ? WHERE id = ?`,
            [
              new Date(ms(raw.createdAt) + Date.now() - ms(control.pausedAt)),
              request.id,
            ],
          );
        await connection.query(
          "UPDATE gameOperationControls SET pausedAt = NULL WHERE game = ? AND gameId = ?",
          [request.game, request.id],
        );
      }
      if (request.action === "lock" || request.action === "unlock")
        await connection.query(
          "UPDATE gameOperationControls SET locked = ? WHERE game = ? AND gameId = ?",
          [request.action === "lock" ? 1 : 0, request.game, request.id],
        );
      if (request.action === "close_betting") {
        if (before.state === "PAUSED")
          throw error("RESUME_BEFORE_STARTING", 409);
        await connection.query(
          `UPDATE ${d.table} SET ${request.game === "roulette" ? "rolledAt" : "startedAt"} = NOW() WHERE id = ?`,
          [request.id],
        );
      }
      if (request.action === "cancel_refund")
        credits = await refund(
          connection,
          request.game,
          request.id,
          raw,
          request.requestId,
        );
      if (request.action === "cashout")
        credits = await safeCashout(connection, raw);
      if (request.action === "recover") {
        // Recovery executes the original committed round. It never changes a seed or result.
        // Nested engines must share this transaction, including their buffered events.
        if (!context?.transaction) throw error("RECOVERY_UNSUPPORTED", 409);
        if (["crash", "roulette"].includes(request.game)) {
          const [[latest]] = await connection.query(
            `SELECT id FROM ${d.table} ORDER BY id DESC LIMIT 1`,
          );
          if (Number(latest?.id) !== request.id)
            throw error("RECOVERY_REQUIRES_CURRENT_ROUND", 409);
        }
        const functions = require("../games/" + request.game + "/functions");
        const recover = {
          crash: "cacheCrash",
          roulette: "cacheRoulette",
          battles: "cacheBattles",
          coinflip: "cacheCoinflips",
        }[request.game];
        if (!recover) throw error("RECOVERY_UNSUPPORTED", 409);
        await functions[recover](request.id);
      }
      await connection.query(
        "UPDATE gameOperationControls SET revision = revision + 1, updatedAt = NOW() WHERE game = ? AND gameId = ?",
        [request.game, request.id],
      );
      const after = request.id
        ? await getGame(connection, request.game, request.id)
        : {
            ...before,
            state: request.action === "lock" ? "LOCKED" : "OPEN",
            locked: request.action === "lock" ? 1 : 0,
            version: String(Number(before.version) + 1),
          };
      await audit(connection, actor, request, before, after, true);
      await commit();
      return { success: true, data: after };
    } catch (cause) {
      await rollback();
      credits = [];
      if (context) context.error = previousError;
      const code = cause.status ? cause.code : "ACTION_FAILED";
      await audit(connection, actor, request, before, before, false, code);
      return { error: code, status: cause.status || 409 };
    }
  });
  if (result.success && !result.replayed) {
    if (
      request.action === "cancel_refund" &&
      ["battles", "coinflip"].includes(request.game)
    ) {
      const f = require("../games/" + request.game + "/functions");
      delete (f.cachedBattles || f.cachedCoinflips)[request.id];
    }
    for (const credit of credits) {
      io.to(String(credit.userId)).emit("balance", "add", credit.amount);
      io.to(String(credit.userId)).emit("game:resync", {
        game: request.game,
        id: request.id,
        action: request.action,
      });
    }
    io.emit("game:control", {
      game: request.game,
      id: request.id,
      action: request.action,
    });
  }
  return result;
}
module.exports = { perform, actions, audit, permission };
