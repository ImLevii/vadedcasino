const {
  paymentEnv,
  configuration,
  context,
} = require("../../trading/providers/config");
const express = require("express");
const router = express.Router();
const { sql, doTransaction } = require("../../../database");
const { durable } = require("../../../runtime/cashier");
const actions = require("./actions");
const { mexc } = require("../../trading/crypto/withdraw/functions");
router.get("/", async (req, res) => {
  try {
    const kind = req.query.kind === "deposits" ? "deposits" : "withdrawals";
    const table = kind === "deposits" ? "cryptoDeposits" : "cryptoWithdraws";
    const allowed =
      kind === "deposits"
        ? ["pending", "completed", "failed"]
        : ["pending", "sending", "sent", "completed", "failed", "cancelled"];
    const status = String(req.query.status || ""),
      search = String(req.query.search || "")
        .trim()
        .slice(0, 128);
    if (status && !allowed.includes(status))
      return res.status(400).json({ error: "INVALID_STATUS" });
    const clauses = ["1=1"],
      args = [];
    if (status) {
      clauses.push("c.status=?");
      args.push(status);
    }
    if (search) {
      clauses.push("(LOWER(u.username) LIKE ? OR c.txId=? OR c.userId=?)");
      args.push(
        "%" + search.toLowerCase() + "%",
        search,
        /^\d{1,18}$/.test(search) ? search : 0,
      );
    }
    const where = clauses.join(" AND ");
    const [[{ total }]] = await sql.query(
      "SELECT COUNT(*) AS total FROM " +
        table +
        " c JOIN users u ON u.id=c.userId WHERE " +
        where,
      args,
    );
    const pages = Math.max(1, Math.ceil(Number(total) / 20)),
      page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
    const [data] = await sql.query(
      "SELECT c.*,u.username FROM " +
        table +
        " c JOIN users u ON u.id=c.userId WHERE " +
        where +
        " ORDER BY c.id DESC LIMIT ? OFFSET ?",
      [...args, 20, (page - 1) * 20],
    );
    const depositConfig = await configuration("coinpayments");
    res.json({
      data,
      page,
      pages,
      total: Number(total),
      retired: true,
      provider: {
        deposits: context.run(depositConfig, () =>
          require("../../trading/crypto/deposit/provider").configuration(),
        ),
        withdrawals: {
          configured: !!(
            paymentEnv("MEXC_API_KEY") && paymentEnv("MEXC_API_SECRET")
          ),
          missing: ["MEXC_API_KEY", "MEXC_API_SECRET"].filter(
            (k) => !paymentEnv(k),
          ),
        },
      },
    });
  } catch (error) {
    console.error("[cashier-list]", error.code || error.message);
    res.status(500).json({ error: "CASHIER_UNAVAILABLE" });
  }
});
async function refund(connection, tx) {
  await connection.query(
    "UPDATE users SET balance=balance+?,cryptoAllowance=CASE WHEN cryptoAllowance IS NULL THEN NULL ELSE cryptoAllowance+? END WHERE id=?",
    [tx.coinAmount, tx.coinAmount, tx.userId],
  );
  await connection.query(
    "INSERT INTO transactions (userId,amount,type,method,methodId) VALUES (?,?,?,?,?)",
    [tx.userId, tx.coinAmount, "in", "crypto-cancel", tx.id],
  );
  await connection.query(
    "UPDATE cryptoWithdraws SET status=?,modifiedAt=NOW() WHERE id=?",
    ["cancelled", tx.id],
  );
}
router.post("/deny/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return res.status(400).json({ error: "INVALID_ID" });
  try {
    const result = await actions.perform(
      req.user,
      "crypto.deny",
      id,
      req.body,
      async (connection) => {
        const [[tx]] = await connection.query(
          "SELECT * FROM cryptoWithdraws WHERE id=? FOR UPDATE",
          [id],
        );
        if (!tx) return actions.fail("TRANSACTION_NOT_FOUND", 404);
        if (tx.status !== "pending")
          return actions.fail("TRANSACTION_NOT_PENDING", 409);
        await refund(connection, tx);
        return {
          success: true,
          balanceUpdate: { userId: tx.userId, amount: tx.coinAmount },
        };
      },
    );
    res.status(result.status || 200).json(result);
  } catch {
    res.status(500).json({ error: "CASHIER_UNAVAILABLE" });
  }
});
router.post("/accept/:id", async (req, res) => {
  return res.status(410).json({ error: "PAYMENT_PROVIDER_REMOVED" });
});
router.post("/reconcile/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return res.status(400).json({ error: "INVALID_ID" });
  const request = actions.intent(req.user, "crypto.reconcile", id, req.body);
  if (request.error) return res.status(request.status).json(request);
  if (!paymentEnv("MEXC_API_KEY") || !paymentEnv("MEXC_API_SECRET"))
    return res.status(503).json({ error: "CRYPTO_PROVIDER_UNAVAILABLE" });
  try {
    const [[snapshot]] = await sql.query(
      "SELECT * FROM cryptoWithdraws WHERE id=?",
      [id],
    );
    if (!snapshot || !["sending", "sent"].includes(snapshot.status))
      return res.status(409).json({ error: "TRANSACTION_NOT_PENDING" });
    const startTime = Math.max(
      new Date(snapshot.createdAt).getTime() - 86400000,
      Date.now() - 89 * 86400000,
    );
    const { data } = await mexc({
      url: "/api/v3/capital/withdraw/history",
      sign: true,
      params: {
        coin: snapshot.currency,
        startTime,
        endTime: Date.now(),
        limit: 1000,
      },
    });
    const remote = Array.isArray(data)
      ? data.find(
          (row) =>
            row.withdrawOrderId === "cosmicluck-" + id ||
            (snapshot.exchangeId &&
              String(row.id) === String(snapshot.exchangeId)),
        )
      : null;
    if (!remote)
      return res
        .status(409)
        .json({ error: "PAYOUT_NOT_CONFIRMED_KEEP_RESERVED" });
    if (
      remote.address !== snapshot.address ||
      remote.coin !== snapshot.currency
    )
      return res.status(409).json({ error: "PAYMENT_IDENTITY_MISMATCH" });
    const result = await durable(() =>
      actions.perform(
        req.user,
        "crypto.reconcile",
        id,
        req.body,
        async (connection) => {
          const [[tx]] = await connection.query(
            "SELECT * FROM cryptoWithdraws WHERE id=? FOR UPDATE",
            [id],
          );
          if (!["sending", "sent"].includes(tx.status))
            return actions.fail("TRANSACTION_NOT_PENDING", 409);
          if ([8, 9].includes(Number(remote.status)))
            await refund(connection, tx);
          else {
            const completed = Number(remote.status) === 7;
            await connection.query(
              "UPDATE cryptoWithdraws SET status=?,exchangeId=?,txId=?,modifiedAt=NOW() WHERE id=?",
              [
                completed ? "completed" : "sent",
                String(remote.id),
                remote.txId || null,
                id,
              ],
            );
            if (completed)
              await connection.query(
                "UPDATE transactions SET type=? WHERE type=? AND method=? AND methodId=? AND userId=?",
                ["withdraw", "out", "crypto", id, tx.userId],
              );
          }
          return {
            success: true,
            providerStatus: Number(remote.status),
            ...([8, 9].includes(Number(remote.status))
              ? { balanceUpdate: { userId: tx.userId, amount: tx.coinAmount } }
              : {}),
          };
        },
      ),
    );
    res.status(result.status || 200).json(result);
  } catch {
    res.status(503).json({ error: "CRYPTO_PROVIDER_UNAVAILABLE" });
  }
});
module.exports = router;
