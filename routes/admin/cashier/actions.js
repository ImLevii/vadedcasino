const { createHash } = require("node:crypto");
const { doTransaction } = require("../../../database");
const { can } = require("../access");
const fail = (error, status = 400) => ({ error, status });
function intent(actor, action, targetId, body = {}) {
  if (!can(actor, "finance.view") || !can(actor, "games.manage"))
    return fail("FORBIDDEN", 403);
  const requestId = String(body.requestId || "");
  const reason = String(body.reason || "").trim();
  if (
    !/^[a-zA-Z0-9-]{16,64}$/.test(requestId) ||
    reason.length < 5 ||
    reason.length > 500
  )
    return fail("INVALID_ACTION_REQUEST");
  const values = Object.entries(body)
    .filter(([key]) => key !== "requestId")
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    requestId,
    reason,
    action,
    targetId,
    adminId: actor.id,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(values))
      .digest("hex"),
  };
}
async function prior(connection, request) {
  const [[row]] = await connection.query(
    "SELECT * FROM cashierAudit WHERE requestId = ? FOR UPDATE",
    [request.requestId],
  );
  if (!row) return null;
  if (
    String(row.adminId) !== String(request.adminId) ||
    row.action !== request.action ||
    Number(row.targetId) !== Number(request.targetId) ||
    row.fingerprint !== request.fingerprint
  )
    return fail("IDEMPOTENCY_CONFLICT", 409);
  return { ...JSON.parse(row.result || "{}"), replayed: true };
}
async function record(connection, request, result) {
  await connection.query(
    "INSERT INTO cashierAudit (requestId, adminId, action, targetId, fingerprint, reason, result) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      request.requestId,
      request.adminId,
      request.action,
      request.targetId,
      request.fingerprint,
      request.reason,
      JSON.stringify(result),
    ],
  );
}
async function perform(actor, action, targetId, body, work) {
  const request = intent(actor, action, targetId, body);
  if (request.error) return request;
  return doTransaction(async (connection, commit) => {
    // This row also serializes same-account retries outside the Vercel coordinator.
    const [[currentActor]] = await connection.query(
      "SELECT id,role FROM users WHERE id = ? FOR UPDATE",
      [actor.id],
    );
    if (
      !can(currentActor, "finance.view") ||
      !can(currentActor, "games.manage")
    )
      return fail("FORBIDDEN", 403);
    const existing = await prior(connection, request);
    if (existing) {
      await commit();
      return existing;
    }
    const result = await work(connection, request);
    if (result.error) return result;
    await record(connection, request, result);
    await commit();
    if (result.balanceUpdate)
      require("../../../socketio/server")
        .to(String(result.balanceUpdate.userId))
        .emit("balance", "add", Number(result.balanceUpdate.amount));
    return result;
  });
}
module.exports = { intent, prior, record, perform, fail };
