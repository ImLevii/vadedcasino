const { paymentEnv } = require("../providers/config");
const express = require("express");
const router = express.Router();

const { sha256 } = require("../../../fairness");
const crypto = require("crypto");

const { doTransaction } = require("../../../database");
const io = require("../../../socketio/server");

const { isAuthed, apiLimiter } = require("../../auth/functions");
const { depositBonus } = require("../../admin/config");
const { roundDecimal, sendLog, newNotification } = require("../../../utils");
const { cryptoData } = require("../crypto/deposit/functions");
const { activateDepositRewards } = require("../../user/rewards/functions");

const buildSignature = (data, secret) => {
  let signatureString = "";

  Object.keys(data)
    .sort()
    .forEach((key) => {
      if (key === "signature") return;
      if (typeof data[key] === "object") return;
      signatureString += data[key];
    });
  return sha256(`${signatureString}${secret}`);
};

router.get("/", async (req, res) => {
  return res.json(require("../providers/legacy").removedCatalog());
});

router.post("/", apiLimiter, isAuthed, async (req, res) => {
  return res.status(410).json({ error: "PAYMENT_PROVIDER_REMOVED" });
});

router.get("/ipn", incomingIpn);
router.post("/ipn", incomingIpn);

async function incomingIpn(req, res) {
  if (!paymentEnv("ZEBRA_API_KEY"))
    return res.status(503).json({ error: "PAYMENT_PROVIDER_UNAVAILABLE" });

  const ipnSignature = buildSignature(req.body, paymentEnv("ZEBRA_API_KEY"));
  const sentSignature = req.body.signature;

  if (
    typeof sentSignature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(sentSignature) ||
    !crypto.timingSafeEqual(
      Buffer.from(ipnSignature, "hex"),
      Buffer.from(sentSignature, "hex"),
    )
  ) {
    return res.status(400).json({ error: "INVALID_SIGNATURE" });
  }

  const orderId = req.body.orderId;
  const value = roundDecimal(+req.body.value / 100);

  try {
    await doTransaction(async (connection, commit) => {
      const [[deposit]] = await connection.query(
        "SELECT cd.id, u.balance, u.username, userId, fiatAmount, completed FROM cardDeposits cd JOIN users u ON u.id = cd.userId WHERE orderId = ? FOR UPDATE",
        [orderId],
      );
      if (!deposit) {
        console.log(`Invalid orderId on cc deposit`, orderId);
        return res.status(400).json({ error: "INVALID_ORDER_ID" });
      }

      if (deposit.completed) return res.json({ success: true });

      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        Math.round(value * 100) !== Math.round(Number(deposit.fiatAmount) * 100)
      ) {
        console.log(`Invalid amount on cc deposit`, value, deposit.fiatAmount);
        return res.status(400).json({ error: "INVALID_AMOUNT" });
      }

      let coins = roundDecimal(
        (deposit.fiatAmount * cryptoData.coinRate.coins) /
          cryptoData.coinRate.usd,
      );

      await connection.query(
        "UPDATE cardDeposits SET coinAmount = ?, completed = 1 WHERE orderId = ?",
        [coins, orderId],
      );
      const [txResult] = await connection.query(
        "INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)",
        [deposit.userId, coins, "deposit", "card", deposit.id],
      );
      await activateDepositRewards(connection, deposit.userId, coins);

      if (depositBonus) {
        const bonus = roundDecimal(coins * depositBonus);
        await connection.query(
          "INSERT INTO transactions (userId, amount, type, method, methodId) VALUES (?, ?, ?, ?, ?)",
          [deposit.userId, bonus, "in", "deposit-bonus", txResult.insertId],
        );
        coins = roundDecimal(coins + bonus);
      }

      await connection.query(
        "UPDATE users SET balance = balance + ? WHERE id = ?",
        [coins, deposit.userId],
      );
      await newNotification(
        deposit.userId,
        "deposit-completed",
        { txId: txResult.insertId, amount: coins },
        connection,
      );

      await commit();

      io.to(deposit.userId).emit("balance", "add", coins);
      sendLog(
        "cardDeposits",
        `*${deposit.username}* (\`${deposit.userId}\`) deposited ${coins} coins ($${deposit.fiatAmount}usd) with credit card.`,
      );
      res.json({ success: true });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

module.exports = router;
