const { sql } = require("../../database");
const { validateJwtToken } = require("../auth/functions");
const { enabled } = require("../../runtime/context");
const sessions = new Map();
const roles = ["OWNER", "ADMIN", "DEV"];
const permissions = {
  OWNER: [
    "games.view",
    "games.manage",
    "games.pause",
    "games.cancel",
    "games.refund",
    "games.recover",
    "games.debug",
    "finance.view",
    "settings.manage",
  ],
  ADMIN: [
    "games.view",
    "games.manage",
    "games.pause",
    "games.cancel",
    "games.refund",
    "games.recover",
    "games.debug",
    "finance.view",
    "settings.manage",
  ],
  DEV: ["games.view", "games.debug"],
};
async function grant(token) {
  if (enabled)
    await require("../../runtime/kv").set("admin", token, true, 30 * 60 * 1000);
  else {
    sessions.set(token, Date.now() + 30 * 60 * 1000);
    for (const [key, expiry] of sessions)
      if (expiry < Date.now()) sessions.delete(key);
  }
}
async function session(token) {
  return enabled
    ? !!(await require("../../runtime/kv").get("admin", token))
    : (sessions.get(token) || 0) > Date.now();
}
function can(user, permission) {
  return (permissions[user?.role] || []).includes(permission);
}
function present(user, value) {
  if (can(user, "finance.view")) return value;
  const financial = new Set([
    "amount",
    "winnings",
    "wagered",
    "paid",
    "exposure",
    "cashout",
    "payout",
  ]);
  const redact = (item) =>
    Array.isArray(item)
      ? item.map(redact)
      : item && typeof item === "object" && !(item instanceof Date)
        ? Object.fromEntries(
            Object.entries(item).map(([key, val]) => [
              key,
              financial.has(key) ? null : redact(val),
            ]),
          )
        : item;
  return redact(value);
}
async function authorizeSocket(token) {
  const valid = validateJwtToken(token);
  if (!valid || !(await session(token))) return null;
  const [[user]] = await sql.query(
    "SELECT id, role, username FROM users WHERE id = ? AND deletedAt IS NULL AND banned = 0",
    [valid.uid],
  );
  return can(user, "games.view") ? user : null;
}
module.exports = {
  roles,
  permissions,
  grant,
  session,
  can,
  authorizeSocket,
  present,
};
