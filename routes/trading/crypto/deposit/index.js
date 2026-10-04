const express = require("express");
const router = express.Router();
const { sql } = require("../../../../database");
const { isAuthed, apiLimiter } = require("../../../auth/functions");
const { cacheCryptos } = require("./functions");
const provider = require("./provider");
const { settle } = require("./settlement");
router.get("/", async (req, res) => {
  return res.json(require("../../providers/legacy").removedCatalog());
});
router.get("/transactions", isAuthed, async (req, res) => {
  try {
    const [[{ total }]] = await sql.query(
      "SELECT COUNT(*) AS total FROM cryptoDeposits WHERE userId=?",
      [req.userId],
    );
    const pages = Math.max(1, Math.ceil(Number(total) / 20)),
      page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
    const [data] = await sql.query(
      "SELECT id,txId,currency,cryptoAmount,fiatAmount,coinAmount,status,createdAt,modifiedAt FROM cryptoDeposits WHERE userId=? ORDER BY id DESC LIMIT ? OFFSET ?",
      [req.userId, 20, (page - 1) * 20],
    );
    res.json({ data, page, pages, total: Number(total) });
  } catch {
    res.status(500).json({ error: "CASHIER_UNAVAILABLE" });
  }
});
router.post("/wallet", isAuthed, apiLimiter, async (req, res) => {
  return res.status(410).json({ error: "PAYMENT_PROVIDER_REMOVED" });
});
// Turning off new deposits never disables settlement of money already sent.
router.post("/ipn", async (req, res) => {
  try {
    provider.verify(req.rawUrlBody, req.header("HMAC"), req.body);
    if (
      Number(req.body.status) >= 100 &&
      !(
        String(req.body.fiat_coin).toUpperCase() === "USD" &&
        Number(req.body.fiat_amount) > 0
      )
    )
      await cacheCryptos();
    const result = await settle(req.body);
    res.status(200).json({ received: true, duplicate: !!result?.duplicate });
  } catch (e) {
    const status =
      e.code === "INVALID_SIGNATURE"
        ? 403
        : e.code === "INVALID_PAYMENT_EVENT"
          ? 400
          : 503;
    res.status(status).json({ error: e.code || "CASHIER_UNAVAILABLE" });
  }
});
module.exports = router;
