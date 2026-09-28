const { createHash } = require("node:crypto");
const { sql, doTransaction } = require("../../database");
const { storage } = require("../../runtime/context");
const { can } = require("./access");
const { audit } = require("./operations-actions");
const { definition, error, json } = require("./operations-read");
const { cacheGameConfig } = require("./gameConfig");
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const version = (rows) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        rows
          .map((r) => [r.key, r.value])
          .sort((a, b) => a[0].localeCompare(b[0])),
      ),
    )
    .digest("hex")
    .slice(0, 24);
async function saveSettings(actor, game, body) {
  definition(game);
  const request = {
    game,
    id: 0,
    action: "settings_update",
    requestId: String(body.requestId || ""),
    version: String(body.version || ""),
    reason: String(body.reason || "").trim(),
  };
  if (
    !/^[a-zA-Z0-9-]{16,64}$/.test(request.requestId) ||
    request.reason.length < 5 ||
    request.reason.length > 500 ||
    !body.values ||
    typeof body.values !== "object" ||
    Array.isArray(body.values)
  )
    throw error("INVALID_SETTINGS_REQUEST");
  request.valuesHash = createHash("sha256")
    .update(JSON.stringify(canonical(body.values)))
    .digest("hex");
  let before = null,
    values = null;
  const context = storage.getStore(),
    previousError = context?.error;
  const result = await (context ? context.transaction : doTransaction)(
    async (connection, commit, rollback) => {
      try {
        await connection.query(
          "SELECT gameId FROM gameOperationControls WHERE game = ? AND gameId = 0 FOR UPDATE",
          [game],
        );
        const [[prior]] = await connection.query(
          "SELECT * FROM gameOperationAudit WHERE requestId = ?",
          [request.requestId],
        );
        if (prior) {
          await commit();
          if (
            String(prior.adminId) !== String(actor.id) ||
            prior.game !== game ||
            prior.action !== request.action ||
            json(prior.parameters, {}).reason !== request.reason ||
            json(prior.parameters, {}).valuesHash !== request.valuesHash ||
            json(prior.parameters, {}).expectedVersion !== request.version
          )
            return { error: "IDEMPOTENCY_CONFLICT", status: 409 };
          if (!can(actor, "settings.manage"))
            return { error: "FORBIDDEN", status: 403 };
          return prior.success
            ? { success: true, replayed: true }
            : { error: prior.errorCode, status: 409 };
        }
        if (!can(actor, "settings.manage")) throw error("FORBIDDEN", 403);
        const [rows] = await connection.query(
          "SELECT * FROM gameSettings WHERE game = ? ORDER BY `key` FOR UPDATE",
          [game],
        );
        before = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        if (version(rows) !== request.version)
          throw error("STALE_GAME_STATE", 409);
        if (!["crash", "roulette", "cases"].includes(game)) {
          const d = definition(game);
          const [[active]] = await connection.query(
            `SELECT g.id FROM ${d.table} g WHERE ${game === "coinflip" ? "g.winnerSide" : "g.endedAt"} IS NULL AND NOT EXISTS (SELECT 1 FROM gameOperationControls c WHERE c.game = ? AND c.gameId = g.id AND c.cancelledAt IS NOT NULL) LIMIT 1`,
            [game],
          );
          if (active) throw error("ACTIVE_GAMES_USE_SETTINGS", 409);
        }
        values = { ...before };
        for (const [key, value] of Object.entries(body.values)) {
          const meta = rows.find((r) => r.key === key);
          if (!meta) throw error("UNKNOWN_SETTING");
          if (meta.type === "number") {
            if (
              typeof value !== "number" ||
              !Number.isFinite(value) ||
              (meta.min != null && value < Number(meta.min)) ||
              (meta.max != null && value > Number(meta.max))
            )
              throw error("INVALID_SETTING_VALUE");
            if (
              meta.step &&
              Math.abs(
                (value - Number(meta.min || 0)) / Number(meta.step) -
                  Math.round(
                    (value - Number(meta.min || 0)) / Number(meta.step),
                  ),
              ) > 1e-6
            )
              throw error("INVALID_SETTING_STEP");
            if (key === "totalTiles" && value !== 25)
              throw error("MINES_REQUIRES_25_TILES");
          } else if (meta.type === "boolean" && typeof value !== "boolean")
            throw error("INVALID_SETTING_VALUE");
          else if (
            meta.type === "string" &&
            (typeof value !== "string" || value.length > 1000)
          )
            throw error("INVALID_SETTING_VALUE");
          else if (meta.type === "json") {
            if (
              !value ||
              typeof value !== "object" ||
              JSON.stringify(value).length > 10000
            )
              throw error("INVALID_SETTING_VALUE");
            if (
              game === "roulette" &&
              key === "colorsMultipliers" &&
              (Number(value[0]) !== 14 ||
                Number(value[3]) !== 7 ||
                ![1, 2].every(
                  (k) =>
                    Number.isFinite(value[k]) &&
                    value[k] >= 1 &&
                    value[k] <= 14,
                ))
            )
              throw error("INVALID_ROULETTE_MULTIPLIERS");
          }
          values[key] =
            meta.type === "json" ? JSON.stringify(value) : String(value);
        }
        if (Number(values.minBet) > Number(values.maxBet))
          throw error("MIN_BET_EXCEEDS_MAX");
        for (const key of Object.keys(body.values))
          await connection.query(
            "UPDATE gameSettings SET value = ? WHERE game = ? AND `key` = ?",
            [values[key], game, key],
          );
        await audit(connection, actor, request, before, values, true);
        await commit();
        return { success: true };
      } catch (cause) {
        await rollback();
        if (context) context.error = previousError;
        const code = cause.status ? cause.code : "SETTINGS_SAVE_FAILED";
        await audit(connection, actor, request, before, before, false, code);
        return { error: code, status: cause.status || 409 };
      }
    },
  );
  if (result.success) await cacheGameConfig();
  return result;
}
module.exports = { version, saveSettings };
