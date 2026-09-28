const express = require("express");
const router = express.Router();
const { sql, doTransaction } = require("../../../../database");
const { isAuthed, apiLimiter } = require("../../../auth/functions");
const {
  cryptoData,
  cacheCryptos,
  current,
  coinpayments,
} = require("./functions");
const { enabledFeatures } = require("../../../admin/config");
const provider = require("./provider");
const { settle } = require("./settlement");
router.get("/", async (req, res) => {
  const configured = provider.configuration().configured,
    available = configured && !!enabledFeatures.cryptoDeposits;
  if (available) await cacheCryptos();
  res.json({
    provider: "CoinPayments",
    available,
    reason: !configured
      ? "CRYPTO_PROVIDER_UNAVAILABLE"
      : !enabledFeatures.cryptoDeposits
        ? "DISABLED"
        : null,
    currencies: Object.values(cryptoData.currencies).map((c) => ({
      ...c,
      price: current(c) ? c.price : null,
      available: available && current(c),
    })),
    coinRate: cryptoData.coinRate,
  });
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
  if (!enabledFeatures.cryptoDeposits)
    return res.status(400).json({ error: "DISABLED" });
  const config = provider.configuration();
  if (!config.configured)
    return res.status(503).json({ error: "CRYPTO_PROVIDER_UNAVAILABLE" });
  const currency = cryptoData.currencies[req.body.currency];
  if (!currency) return res.status(400).json({ error: "INVALID_CURRENCY" });
  try {
    await cacheCryptos();
    if (!current(currency))
      return res.status(503).json({ error: "PAYMENT_RATE_UNAVAILABLE" });
    const wallet = await doTransaction(async (connection, commit) => {
      await connection.query("SELECT id FROM users WHERE id=? FOR UPDATE", [
        req.userId,
      ]);
      let [[row]] = await connection.query(
        "SELECT w.id,w.address,m.destinationTag FROM cryptoWallets w LEFT JOIN cryptoWalletMetadata m ON m.walletId=w.id WHERE w.userId=? AND w.currency=? ORDER BY w.id LIMIT 1",
        [req.userId, currency.id],
      );
      if (!row) {
        const result = await coinpayments.getCallbackAddress({
          currency: currency.id,
          ipn_url: config.callbackUrl,
          label: "Cosmic Luck deposit",
        });
        if (
          typeof result.address !== "string" ||
          !result.address ||
          result.address.length > 512
        )
          throw provider.failure("CRYPTO_PROVIDER_UNAVAILABLE");
        const [created] = await connection.query(
          "INSERT INTO cryptoWallets (userId,currency,address) VALUES (?,?,?)",
          [req.userId, currency.id, result.address],
        );
        const tag = result.dest_tag == null ? null : String(result.dest_tag);
        await connection.query(
          "INSERT INTO cryptoWalletMetadata (walletId,destinationTag) VALUES (?,?)",
          [created.insertId, tag],
        );
        row = { address: result.address, destinationTag: tag };
      }
      await commit();
      return row;
    });
    res.json({
      coinRate: cryptoData.coinRate,
      currency,
      address: wallet.address,
      destinationTag: wallet.destinationTag || null,
    });
  } catch (e) {
    res
      .status(503)
      .json({
        error:
          e.code === "PAYMENT_RATE_UNAVAILABLE"
            ? e.code
            : "CRYPTO_PROVIDER_UNAVAILABLE",
      });
  }
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
