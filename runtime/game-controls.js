const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const nodeId = `${process.env.VERCEL_REGION || "local"}-${randomUUID().slice(0, 8)}`;
async function ensureOperationsSchema(connection) {
  for (const statement of fs
    .readFileSync(path.join(__dirname, "../database/operations.sql"), "utf8")
    .split(";")
    .filter((s) => s.trim())) {
    await connection.query(statement);
  }
  for (const game of [
    "crash",
    "roulette",
    "mines",
    "blackjack",
    "battles",
    "coinflip",
    "cases",
    "slots",
  ]) {
    await connection.query(
      "INSERT IGNORE INTO gameOperationControls (game, gameId) VALUES (?, 0)",
      [game],
    );
  }
  if (
    connection.nativeQuery ||
    ["postgres", "postgresql", "neon"].includes(process.env.SQL_DIALECT)
  ) {
    await connection.query(
      "CREATE INDEX IF NOT EXISTS idx_bets_operations_round ON bets (game, gameId)",
    );
    await connection.query(
      "CREATE INDEX IF NOT EXISTS idx_operations_presence_user ON gameOperationPresence (userId, lastSeen)",
    );
    for (const table of ["crash", "roulette", "mines", "blackjack", "battles"])
      await connection.query(
        `CREATE INDEX IF NOT EXISTS idx_operations_${table}_active ON ${table} (endedAt, id)`,
      );
    await connection.query(
      "CREATE INDEX IF NOT EXISTS idx_operations_coinflips_active ON coinflips (startedAt, id)",
    );
  }
}
async function getControl(connection, game, gameId) {
  const [[row]] = await connection.query(
    "SELECT * FROM gameOperationControls WHERE game = ? AND gameId = ?",
    [game, gameId],
  );
  return (
    row || {
      game,
      gameId,
      revision: 0,
      pausedAt: null,
      locked: 0,
      cancelledAt: null,
    }
  );
}
async function admissionError(
  connection,
  game,
  gameId = 0,
  { cashout = false, existing = false } = {},
) {
  const [rows] = await connection.query(
    "SELECT pausedAt, locked, cancelledAt FROM gameOperationControls WHERE game = ? AND gameId IN (?)",
    [game, existing ? [gameId] : [0, gameId]],
  );
  if (rows.some((row) => row.cancelledAt)) return "GAME_CANCELLED";
  if (!cashout && rows.some((row) => row.pausedAt || row.locked))
    return "BETTING_LOCKED";
  return null;
}
async function roundRules(connection, game, gameId, defaults) {
  const [[row]] = await connection.query(
    "SELECT config FROM gameRoundRules WHERE game = ? AND gameId = ?",
    [game, gameId],
  );
  if (row) return JSON.parse(row.config);
  await connection.query(
    "INSERT IGNORE INTO gameRoundRules (game, gameId, config) VALUES (?, ?, ?)",
    [game, gameId, JSON.stringify(defaults)],
  );
  return defaults;
}
async function health(connection, game, error = null) {
  const code = error
    ? /^[A-Z][A-Z0-9_]{2,70}$/.test(error.code || "")
      ? error.code
      : "ADVANCEMENT_FAILED"
    : null;
  await connection.query(
    "INSERT INTO gameOperationHealth (game, nodeId, updatedAt, errorCode, failedAt) VALUES (?, ?, NOW(), ?, ?) ON DUPLICATE KEY UPDATE nodeId = VALUES(nodeId), updatedAt = VALUES(updatedAt), errorCode = VALUES(errorCode), failedAt = VALUES(failedAt)",
    [game, nodeId, code, error ? new Date() : null],
  );
}
async function presence(connection, socket) {
  await connection.query(
    "INSERT INTO gameOperationPresence (socketId, userId, nodeId, lastSeen) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE userId = VALUES(userId), nodeId = VALUES(nodeId), lastSeen = VALUES(lastSeen)",
    [socket.id, socket.userId || null, nodeId],
  );
}
module.exports = {
  ensureOperationsSchema,
  getControl,
  admissionError,
  roundRules,
  health,
  presence,
  nodeId,
};
