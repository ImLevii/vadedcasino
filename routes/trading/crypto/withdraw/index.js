const express = require("express");
const router = express.Router();

const { sql, doTransaction } = require("../../../../database");
const io = require("../../../../socketio/server");

const { isAuthed, apiLimiter } = require("../../../auth/functions");
const { sendLog } = require("../../../../utils");

router.get("/", async (req, res) => {
  return res.json(require("../../providers/legacy").removedCatalog());
});

const resultsPerPage = 50;

router.get("/transactions", isAuthed, async (req, res) => {
  let page = parseInt(req.query.page);
  page = !isNaN(page) && page > 0 ? page : 1;

  const offset = (page - 1) * resultsPerPage;

  const [[{ total }]] = await sql.query(
    "SELECT COUNT(*) as total FROM cryptoWithdraws WHERE userId = ?",
    [req.userId],
  );
  if (!total) return res.json({ page: 1, pages: 0, total: 0, data: [] });

  const pages = Math.ceil(total / resultsPerPage);

  if (page > pages) return res.status(404).json({ error: "PAGE_NOT_FOUND" });
  const [data] = await sql.query(
    "SELECT id, txId, chain, currency, cryptoAmount, fiatAmount, coinAmount, status, createdAt, modifiedAt FROM cryptoWithdraws WHERE userId = ? ORDER BY id DESC LIMIT ? OFFSET ?",
    [req.userId, resultsPerPage, offset],
  );

  res.json({
    page,
    pages,
    total,
    data,
  });
});

router.post("/", isAuthed, apiLimiter, async (req, res) => {
  return res.status(410).json({ error: "PAYMENT_PROVIDER_REMOVED" });
});

router.post("/cancel/:id", isAuthed, apiLimiter, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "INVALID_ID" });

  try {
    await doTransaction(async (connection, commit) => {
      const [[transaction]] = await connection.query(
        "SELECT cw.id, username, coinAmount, userId, status FROM cryptoWithdraws cw JOIN users u ON u.id = cw.userId WHERE cw.id = ? AND userId = ? FOR UPDATE",
        [id, req.userId],
      );

      if (!transaction)
        return res.status(404).json({ error: "TRANSACTION_NOT_FOUND" });
      if (transaction.status != "pending")
        return res.status(400).json({ error: "TRANSACTION_NOT_PENDING" });

      await connection.query(
        "UPDATE users SET balance = balance + ?, cryptoAllowance = CASE WHEN cryptoAllowance IS NULL THEN NULL ELSE cryptoAllowance + ? END WHERE id = ?",
        [transaction.coinAmount, transaction.coinAmount, transaction.userId],
      );
      await connection.query(
        "INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)",
        [transaction.userId, transaction.coinAmount, "in", "crypto-cancel", id],
      );

      await connection.query(
        "UPDATE cryptoWithdraws SET status = ? WHERE id = ?",
        ["cancelled", id],
      );
      await commit();
      io.to(String(transaction.userId)).emit(
        "balance",
        "add",
        transaction.coinAmount,
      );

      sendLog(
        "cryptoWithdraws",
        `Crypto withdraw cancelled by *${transaction.username}* (\`${req.userId}\`) - ${transaction.coinAmount} coins (#${id})`,
      );
      res.json({ success: true });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
});

module.exports = router;
