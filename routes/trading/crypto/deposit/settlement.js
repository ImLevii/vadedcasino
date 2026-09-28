const { doTransaction } = require("../../../../database");
const { cryptoData, current } = require("./functions");
const { roundDecimal, newNotification } = require("../../../../utils");
const { activateDepositRewards } = require("../../../user/rewards/functions");
const io = require("../../../../socketio/server");
const error = (code) => Object.assign(new Error(code), { code });
async function settle(event) {
  if (event.ipn_type !== "deposit") return { ignored: true };
  const currency =
    cryptoData.currencies[event.currency] ||
    (event.currency === "BUSD.BEP20" ? { id: event.currency } : null);
  const amount = Number(event.amount),
    statusNumber = Number(event.status);
  if (
    !currency ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1e10 ||
    !Number.isFinite(statusNumber) ||
    !event.deposit_id ||
    !event.txn_id ||
    String(event.deposit_id).length > 100 ||
    String(event.txn_id).length > 255
  )
    throw error("INVALID_PAYMENT_EVENT");
  const status =
    statusNumber < 0 ? "failed" : statusNumber >= 100 ? "completed" : "pending";
  const receiptId = "coinpayments:" + event.deposit_id;
  const result = await doTransaction(async (connection, commit) => {
    // Lock the wallet before looking for a receipt. Parallel first callbacks serialize too.
    const [[wallet]] = await connection.query(
      "SELECT id,userId FROM cryptoWallets WHERE address=? AND currency=? FOR UPDATE",
      [event.address, currency.id],
    );
    if (!wallet) throw error("PAYMENT_WALLET_NOT_FOUND");
    const [[receipt]] = await connection.query(
      "SELECT * FROM cryptoDepositReceipts WHERE providerId=? FOR UPDATE",
      [receiptId],
    );
    if (receipt && String(receipt.walletId) !== String(wallet.id))
      throw error("PAYMENT_IDENTITY_MISMATCH");
    let existing;
    if (receipt?.depositId)
      [[existing]] = await connection.query(
        "SELECT * FROM cryptoDeposits WHERE id=? FOR UPDATE",
        [receipt.depositId],
      );
    else {
      // Adopt historical rows so callbacks for pre-migration deposits cannot credit again.
      [[existing]] = await connection.query(
        "SELECT d.* FROM cryptoDeposits d WHERE d.txId=? AND d.currency=? AND d.userId=? AND NOT EXISTS (SELECT 1 FROM cryptoDepositReceipts r WHERE r.depositId=d.id) ORDER BY d.id LIMIT 1 FOR UPDATE",
        [event.txn_id, currency.id, wallet.userId],
      );
      await connection.query(
        "INSERT INTO cryptoDepositReceipts (providerId,walletId,depositId) VALUES (?,?,?)",
        [receiptId, wallet.id, existing?.id || null],
      );
    }
    if (
      existing &&
      (existing.status === "completed" ||
        (existing.status === "failed" && status !== "completed"))
    ) {
      await commit();
      return { duplicate: true };
    }
    let usd = 0,
      coins = 0;
    if (status === "completed") {
      const signedFiat =
        String(event.fiat_coin || "").toUpperCase() === "USD"
          ? Number(event.fiat_amount)
          : 0;
      usd =
        Number.isFinite(signedFiat) && signedFiat > 0
          ? signedFiat
          : current(currency)
            ? amount * currency.price
            : 0;
      if (!Number.isFinite(usd) || usd <= 0 || usd > 1000000)
        throw error("PAYMENT_RATE_UNAVAILABLE");
      coins = roundDecimal(
        (usd * cryptoData.coinRate.coins) / cryptoData.coinRate.usd,
      );
      if (coins < 0.01) throw error("INVALID_PAYMENT_AMOUNT");
    }
    let depositId = existing?.id;
    if (depositId)
      await connection.query(
        "UPDATE cryptoDeposits SET status=?,cryptoAmount=?,coinAmount=?,fiatAmount=?,modifiedAt=NOW() WHERE id=?",
        [status, amount, coins, usd, depositId],
      );
    else {
      const [created] = await connection.query(
        "INSERT INTO cryptoDeposits (userId,currency,cryptoAmount,fiatAmount,coinAmount,txId,status) VALUES (?,?,?,?,?,?,?)",
        [wallet.userId, currency.id, amount, usd, coins, event.txn_id, status],
      );
      depositId = created.insertId;
    }
    await connection.query(
      "UPDATE cryptoDepositReceipts SET depositId=? WHERE providerId=?",
      [depositId, receiptId],
    );
    if (status !== "completed") {
      await commit();
      return { success: true };
    }
    // The balance, receipt, rewards and ledger commit together.
    const [tx] = await connection.query(
      "INSERT INTO transactions (userId,amount,type,method,methodId) VALUES (?,?,?,?,?)",
      [wallet.userId, coins, "deposit", "crypto", depositId],
    );
    await activateDepositRewards(connection, wallet.userId, coins);
    const depositBonus = require("../../../admin/config").depositBonus;
    if (depositBonus) {
      const bonus = roundDecimal(coins * depositBonus);
      await connection.query(
        "INSERT INTO transactions (userId,amount,type,method,methodId) VALUES (?,?,?,?,?)",
        [wallet.userId, bonus, "in", "deposit-bonus", tx.insertId],
      );
      coins = roundDecimal(coins + bonus);
    }
    await connection.query("UPDATE users SET balance=balance+? WHERE id=?", [
      coins,
      wallet.userId,
    ]);
    await newNotification(
      wallet.userId,
      "deposit-completed",
      { txId: tx.insertId, amount: coins },
      connection,
    );
    await commit();
    return { success: true, userId: wallet.userId, coins };
  });
  if (result?.userId) {
    io.to(String(result.userId)).emit("balance", "add", result.coins);
    io.to(String(result.userId)).emit(
      "toast",
      "success",
      "Your crypto deposit has been credited.",
    );
  }
  return result;
}
module.exports = { settle };
