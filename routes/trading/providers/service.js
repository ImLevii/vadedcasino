const { sql, doTransaction } = require("../../../database");
const { durable } = require("../../../runtime/cashier");
const { configuration, availability, fail } = require("./config");
const clients = require("./clients");
const actions = require("../../admin/cashier/actions");
const { can } = require("../../admin/access");
const { cryptoData } = require("../crypto/deposit/functions");
const { activateDepositRewards } = require("../../user/rewards/functions");
const terminal = (status) =>
  ["completed", "failed", "cancelled", "disputed"].includes(status);
const emit = (result) => {
  if (result?.balanceUpdate)
    require("../../../socketio/server")
      .to(String(result.balanceUpdate.userId))
      .emit("balance", "add", result.balanceUpdate.amount);
  return result;
};
function quote(config, type, amount) {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount < 0.01 ||
    amount > 1000000 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
  )
    throw fail("INVALID_AMOUNT");
  const rate = cryptoData.coinRate;
  if (!rate?.coins || !rate?.usd) throw fail("PAYMENT_RATE_UNAVAILABLE", 503);
  const base = Math.round((amount / rate.coins) * rate.usd * 100),
    dep = type === "deposit";
  if (
    base < Math.round((dep ? config.minDeposit : config.minWithdrawal) * 100) ||
    base > Math.round((dep ? config.maxDeposit : config.maxWithdrawal) * 100)
  )
    throw fail("PAYMENT_AMOUNT_OUTSIDE_LIMITS");
  const fee =
    Math.round(
      (base * (dep ? config.depositPercent : config.withdrawalPercent)) / 100,
    ) + Math.round((dep ? config.depositFixed : config.withdrawalFixed) * 100);
  const fiat = dep ? base + fee : base - fee;
  if (fiat < 1) throw fail("PAYMENT_AMOUNT_BELOW_FEES");
  return { coins: amount, fiatCents: fiat, feeCents: fee, currency: "USD" };
}
async function payment(id, userId) {
  const [[row]] = await sql.query(
    "SELECT * FROM providerPayments WHERE id=?" +
      (userId != null ? " AND userId=?" : ""),
    userId != null ? [id, userId] : [id],
  );
  if (!row) throw fail("PAYMENT_NOT_FOUND", 404);
  return row;
}
function expose(row) {
  return Object.fromEntries(
    [
      "id",
      "requestId",
      "provider",
      "mode",
      "flow",
      "type",
      "status",
      "coins",
      "fiatCents",
      "feeCents",
      "currency",
      "receiver",
      "providerRef",
      "checkoutUrl",
      "lastError",
      "createdAt",
      "updatedAt",
    ].map((key) => [key, row[key]]),
  );
}
async function assertAccess(userId, config) {
  if (config.mode !== "sandbox") return;
  const [[user]] = await sql.query("SELECT id,role FROM users WHERE id=?", [
    userId,
  ]);
  if (!can(user, "finance.view"))
    throw fail("PAYMENT_TEST_MODE_STAFF_ONLY", 403);
}
async function assertEligibility(connection, user, value) {
  if (await require("../../admin/config").checkAccountLock(user, connection))
    throw fail("ACCOUNT_LOCKED", 403);
  if (user.sponsorLock) throw fail("SPONSOR_LOCK", 403);
  if (user.perms > 1) return;
  if (user.xp < 5000) throw fail("INSUFFICIENT_XP");
  const [[recent]] = await connection.query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE userId=? AND type='deposit' AND createdAt>?",
    [user.id, new Date(Date.now() - 14 * 86400000)],
  );
  if (recent.total < 200) throw fail("INSUFFICIENT_DEPOSITS");
  const [[deposited]] = await connection.query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE userId=? AND type='deposit'",
    [user.id],
  );
  const [[wagered]] = await connection.query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM bets WHERE userId=? AND completed=1",
    [user.id],
  );
  const [[last]] = await connection.query(
    "SELECT amount,createdAt FROM transactions WHERE userId=? AND type='deposit' ORDER BY id DESC LIMIT 1",
    [user.id],
  );
  if (!last || Number(deposited.total) > Number(wagered.total))
    throw fail("NOT_ENOUGH_WAGERED_WITHDRAW");
  const [[since]] = await connection.query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM bets WHERE userId=? AND completed=1 AND createdAt>?",
    [user.id, last.createdAt],
  );
  if (Number(last.amount) > Number(since.total))
    throw fail("NOT_ENOUGH_WAGERED_WITHDRAW");
  if (!user.verified) {
    const [[past]] = await connection.query(
      "SELECT COALESCE(SUM(fiatCents),0) AS total FROM providerPayments WHERE userId=? AND type='withdrawal' AND mode='live' AND status NOT IN ('failed','cancelled')",
      [user.id],
    );
    const [[crypto]] = await connection.query(
      "SELECT COALESCE(SUM(fiatAmount),0) AS total FROM cryptoWithdraws WHERE userId=? AND status NOT IN ('failed','cancelled')",
      [user.id],
    );
    const [[skins]] = await connection.query(
      "SELECT COALESCE(SUM(providerValue),0) AS total FROM paymentTransactions WHERE userId=? AND type='withdrawal' AND status NOT IN ('failed','cancelled')",
      [user.id],
    );
    if (
      value +
        Number(past.total) / 100 +
        Number(crypto.total) +
        Number(skins.total) >
      150
    )
      throw fail("KYC");
  }
}
async function create(userId, provider, type, body) {
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(body.requestId || ""))
    throw fail("INVALID_PAYMENT_REQUEST");
  if (
    provider === "paypal" &&
    type === "withdrawal" &&
    body.requestId.length > 63
  )
    throw fail("INVALID_PAYMENT_REQUEST");
  const config = await configuration(provider);
  if (config.definition.retired) throw fail("PAYMENT_PROVIDER_REMOVED", 410);
  if (!config.definition.integrated)
    throw fail("PAYMENT_DIRECTION_UNSUPPORTED");
  if (!config.definition[type === "deposit" ? "deposits" : "withdrawals"])
    throw fail("PAYMENT_DIRECTION_UNSUPPORTED");
  await assertAccess(userId, config);
  const unavailable = availability(config, type);
  if (unavailable) throw fail(unavailable, 503);
  const flow = provider === "paypal" && type === "deposit" && config.depositFlow === "email" ? "email" : "api";
  const initialStatus = type === "deposit" ? flow === "email" ? "awaiting_payment" : "creating" : "queued";
  let receiver = flow === "email" ? config.credentials.email.trim().toLowerCase() : null;
  if (type === "withdrawal") {
    if (provider === "paypal") {
      receiver = String(body.receiver || "")
        .trim()
        .toLowerCase();
      if (
        receiver.length > 127 ||
        !/^[\x21-\x7e]+$/.test(receiver) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiver)
      )
        throw fail("INVALID_PAYPAL_RECIPIENT");
    } else {
      const [[account]] = await sql.query(
        "SELECT accountId FROM providerAccounts WHERE userId=? AND provider='stripe' AND mode=?",
        [userId, config.mode],
      );
      if (!account?.accountId) throw fail("STRIPE_ONBOARDING_REQUIRED");
      const remote = await clients.request(
        config,
        "/v1/accounts/" + encodeURIComponent(account.accountId),
      );
      if (
        !remote.payouts_enabled ||
        remote.capabilities?.transfers !== "active" ||
        remote.metadata?.userId !== String(userId)
      )
        throw fail("STRIPE_ONBOARDING_REQUIRED");
      receiver = account.accountId;
    }
  }
  const amounts = quote(config, type, body.amount);
  const row = await durable(() =>
    doTransaction(async (connection, commit) => {
      const [[user]] = await connection.query(
        "SELECT id,role,username,balance,heldBalance,xp,accountLock,sponsorLock,verified,perms FROM users WHERE id=? FOR UPDATE",
        [userId],
      );
      if (!user) throw fail("UNAUTHORIZED", 401);
      const [[prior]] = await connection.query(
        "SELECT * FROM providerPayments WHERE requestId=? FOR UPDATE",
        [body.requestId],
      );
      if (prior) {
        if (
          String(prior.userId) !== String(userId) ||
          prior.provider !== provider ||
          prior.type !== type ||
          prior.flow !== flow ||
          Number(prior.coins) !== body.amount ||
          (type === "withdrawal" && prior.receiver !== receiver)
        )
          throw fail("IDEMPOTENCY_CONFLICT", 409);
        await commit();
        return prior;
      }
      if (type === "withdrawal" && config.mode === "live") {
        await assertEligibility(connection, user, amounts.fiatCents / 100);
        if (Number(user.balance) < amounts.coins)
          throw fail("INSUFFICIENT_BALANCE");
        const [[open]] = await connection.query(
          "SELECT COUNT(*) AS total FROM providerPayments WHERE userId=? AND type='withdrawal' AND status IN ('queued','sending','unknown')",
          [userId],
        );
        if (open.total) throw fail("PENDING_WITHDRAWAL");
      }
      const [result] = await connection.query(
        "INSERT INTO providerPayments (requestId,userId,provider,mode,flow,type,status,coins,fiatCents,feeCents,receiver) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [
          body.requestId,
          userId,
          provider,
          config.mode,
          flow,
          type,
          initialStatus,
          amounts.coins,
          amounts.fiatCents,
          amounts.feeCents,
          receiver,
        ],
      );
      if (type === "withdrawal" && config.mode === "live") {
        await connection.query(
          "UPDATE users SET balance=balance-?,heldBalance=heldBalance+? WHERE id=?",
          [amounts.coins, amounts.coins, userId],
        );
        await connection.query(
          "INSERT INTO transactions (userId,amount,type,method,methodId) VALUES (?,?,?,?,?)",
          [userId, amounts.coins, "out", provider + "-hold", result.insertId],
        );
      }
      await commit();
      return {
        id: result.insertId,
        requestId: body.requestId,
        userId,
        provider,
        mode: config.mode,
        flow,
        type,
        status: initialStatus,
        receiver,
        ...amounts,
        createdAt: new Date(),
        newReservation: type === "withdrawal" && config.mode === "live",
      };
    }),
  );
  if (row.newReservation)
    emit({ balanceUpdate: { userId, amount: -row.coins } });
  if (row.flow === "email" || type === "withdrawal" || row.checkoutUrl || terminal(row.status))
    return expose(row);
  if (
    Date.now() - new Date(row.createdAt).getTime() >
    (provider === "paypal" ? 5 : 23) * 3600000
  )
    throw fail("PAYMENT_REQUIRES_RECONCILIATION", 409);
  try {
    const remote = await clients.createDeposit(
      await configuration(provider, row.mode),
      row,
    );
    await durable(() =>
      sql.query(
        "UPDATE providerPayments SET providerRef=COALESCE(providerRef,?),checkoutUrl=?,status=CASE WHEN settled=0 THEN 'awaiting_payment' ELSE status END,lastError=NULL,updatedAt=NOW() WHERE id=?",
        [remote.providerRef, remote.checkoutUrl, row.id],
      ),
    );
    return expose(await payment(row.id, userId));
  } catch (e) {
    await durable(() =>
      sql.query(
        "UPDATE providerPayments SET status='unknown',lastError=?,updatedAt=NOW() WHERE id=? AND settled=0",
        [e.code || "PAYMENT_PROVIDER_REQUEST_UNCONFIRMED", row.id],
      ),
    );
    throw fail("PAYMENT_REQUIRES_RECONCILIATION", 202);
  }
}
// Shared settlement work stays inside the caller's financial transaction.
async function applySettlement(connection, snapshot, confirmation) {
  const [[user]] = await connection.query(
    "SELECT id,balance,heldBalance FROM users WHERE id=? FOR UPDATE",
    [snapshot.userId],
  );
  const [[row]] = await connection.query(
    "SELECT * FROM providerPayments WHERE id=? FOR UPDATE",
    [snapshot.id],
  );
  if (row.flow === "email" && !confirmation.manualApproved)
    throw fail("PAYMENT_MANUAL_REVIEW_REQUIRED", 409);
  if (row.settled) {
    return { success: true, duplicate: true };
  }
  if (
    row.type === "withdrawal" &&
    !["sending", "unknown"].includes(row.status)
  )
    throw fail("PAYMENT_STATE_CONFLICT", 409);
  if (row.type === "deposit" && confirmation.settlementRef) {
    const [[dispute]] = await connection.query(
      "SELECT settlementRef FROM providerDisputes WHERE provider=? AND mode=? AND settlementRef=?",
      [row.provider, row.mode, confirmation.settlementRef],
    );
    if (dispute) {
      if (row.mode === "live")
        await connection.query(
          "UPDATE users SET accountLock=1 WHERE id=?",
          [row.userId],
        );
      await connection.query(
        "UPDATE providerPayments SET providerRef=COALESCE(providerRef,?),settlementRef=COALESCE(settlementRef,?),status='disputed',settled=1,lastError='PAYMENT_REQUIRES_FINANCE_REVIEW',updatedAt=NOW() WHERE id=?",
        [
          confirmation.providerRef || null,
          confirmation.settlementRef,
          row.id,
        ],
      );
      return { success: true, disputed: true };
    }
  }
  let delta = 0;
  if (
    confirmation.status === "completed" &&
    row.type === "deposit" &&
    row.mode === "live"
  ) {
    await connection.query(
      "INSERT INTO transactions (userId,amount,type,method,methodId) VALUES (?,?,?,?,?)",
      [row.userId, row.coins, "deposit", row.provider, row.id],
    );
    await activateDepositRewards(connection, row.userId, Number(row.coins));
    await connection.query(
      "UPDATE users SET balance=balance+? WHERE id=?",
      [row.coins, row.userId],
    );
    delta = Number(row.coins);
  } else if (
    row.type === "withdrawal" &&
    ["completed", "failed", "cancelled"].includes(confirmation.status) &&
    row.mode === "live"
  ) {
    if (Number(user.heldBalance) < Number(row.coins))
      throw fail("HELD_BALANCE_INVARIANT", 409);
    const refund = confirmation.status !== "completed";
    await connection.query(
      "UPDATE users SET heldBalance=heldBalance-?,balance=balance+? WHERE id=?",
      [row.coins, refund ? row.coins : 0, row.userId],
    );
    if (refund) {
      await connection.query(
        "INSERT INTO transactions (userId,amount,type,method,methodId) VALUES (?,?,?,?,?)",
        [row.userId, row.coins, "in", row.provider + "-refund", row.id],
      );
      delta = Number(row.coins);
    } else
      await connection.query(
        "UPDATE transactions SET type='withdraw',method=? WHERE method=? AND methodId=? AND userId=?",
        [row.provider, row.provider + "-hold", row.id, row.userId],
      );
  }
  // Unpaid/expired deposits remain unsettled: a later verified payment can still be credited.
  const done =
    row.type === "deposit"
      ? confirmation.status === "completed"
      : terminal(confirmation.status);
  await connection.query(
    "UPDATE providerPayments SET providerRef=COALESCE(providerRef,?),settlementRef=COALESCE(settlementRef,?),checkoutUrl=COALESCE(checkoutUrl,?),status=?,settled=?,finalizedAt=?,lastError=NULL,updatedAt=NOW() WHERE id=?",
    [
      confirmation.providerRef || null,
      confirmation.settlementRef || null,
      confirmation.checkoutUrl || null,
      confirmation.status,
      done ? 1 : 0,
      done ? new Date() : null,
      row.id,
    ],
  );
  return {
    success: true,
    ...(delta
      ? { balanceUpdate: { userId: row.userId, amount: delta } }
      : {}),
  };
}
async function settle(snapshot, confirmation) {
  const result = await durable(() => doTransaction(async (connection, commit) => {
    const result = await applySettlement(connection, snapshot, confirmation);
    await commit();
    return result;
  }));
  return emit(result);
}
async function reconcile(
  snapshot,
  capture = false,
  providerRef = snapshot.providerRef,
) {
  if (snapshot.flow === "email") throw fail("PAYMENT_MANUAL_REVIEW_REQUIRED", 409);
  if (snapshot.settled) return { success: true, duplicate: true };
  const config = await configuration(snapshot.provider, snapshot.mode);
  let remote =
    snapshot.type === "deposit"
      ? !providerRef ? await clients.findDeposit(config, snapshot) : await clients.readDeposit(
          config,
          providerRef,
          false,
          snapshot.requestId,
        )
      : await clients.readPayout(config, snapshot, providerRef);
  let confirmation =
    snapshot.type === "deposit"
      ? clients.confirmDeposit(config, snapshot, remote)
      : clients.confirmPayout(config, snapshot, remote);
  // Verify the original order before capturing. Replayed confirmations read an
  // already completed order without submitting another capture request.
  if (capture && snapshot.type === "deposit" && snapshot.provider === "paypal" && remote.status === "APPROVED") {
    remote = await clients.readDeposit(config, providerRef, true, snapshot.requestId);
    confirmation = clients.confirmDeposit(config, snapshot, remote);
  }
  return settle(snapshot, confirmation);
}
async function reviewEmailDeposit(actor, id, body, approved) {
  const transactionRef = String(body.transactionRef || "").trim().toUpperCase();
  if (approved && (!/^[A-Z0-9]{8,64}$/.test(transactionRef) || body.confirmedReceived !== true))
    throw fail("PAYPAL_RECEIPT_CONFIRMATION_REQUIRED");
  return durable(() => actions.perform(actor, approved ? "provider.approve-email" : "provider.reject-email", id, body, async (connection) => {
    const snapshot = await payment(id);
    // Match automatic settlement's lock order to serialize player credits.
    await connection.query("SELECT id FROM users WHERE id=? FOR UPDATE", [snapshot.userId]);
    const [[row]] = await connection.query("SELECT * FROM providerPayments WHERE id=? FOR UPDATE", [id]);
    if (row.provider !== "paypal" || row.type !== "deposit" || row.flow !== "email" || row.status !== "awaiting_payment" || row.settled)
      return { error: "PAYMENT_STATE_CONFLICT", status: 409 };
    if (!approved) {
      await connection.query("UPDATE providerPayments SET status='cancelled',settled=1,finalizedAt=NOW(),updatedAt=NOW() WHERE id=?", [id]);
      return { success: true };
    }
    // Serialize receipt claims across users, including automatic API captures.
    // The database's unique settlement index also protects against concurrent API settlement.
    await connection.query("SELECT id FROM paymentProviders WHERE id='paypal' FOR UPDATE");
    const [[used]] = await connection.query("SELECT id FROM providerPayments WHERE provider='paypal' AND mode=? AND settlementRef=? AND id<>?", [row.mode, transactionRef, id]);
    if (used) return { error: "PAYPAL_TRANSACTION_ALREADY_USED", status: 409 };
    return applySettlement(connection, row, { status: "completed", settlementRef: transactionRef, manualApproved: true });
  }));
}
const approveEmailDeposit = (actor, id, body) => reviewEmailDeposit(actor, id, body, true);
const rejectEmailDeposit = (actor, id, body) => reviewEmailDeposit(actor, id, body, false);
async function accept(actor, id, body) {
  const snapshot = await payment(id),
    config = await configuration(snapshot.provider, snapshot.mode);
  const unavailable = availability(config, "withdrawal");
  if (unavailable) throw fail(unavailable, 503);
  const claim = await durable(() =>
    actions.perform(actor, "provider.accept", id, body, async (connection) => {
      const [[row]] = await connection.query(
        "SELECT * FROM providerPayments WHERE id=? FOR UPDATE",
        [id],
      );
      if (row.type !== "withdrawal" || row.status !== "queued")
        return { error: "PAYMENT_NOT_QUEUED", status: 409 };
      await connection.query(
        "UPDATE providerPayments SET status='sending',updatedAt=NOW() WHERE id=?",
        [id],
      );
      return { success: true, claimed: true };
    }),
  );
  if (claim.error || claim.replayed) return claim;
  try {
    const remote = await clients.createPayout(config, snapshot);
    await durable(() =>
      sql.query(
        "UPDATE providerPayments SET providerRef=?,updatedAt=NOW() WHERE id=?",
        [remote.providerRef, id],
      ),
    );
    try {
      await reconcile(await payment(id));
    } catch {
      /* Provider may still be processing. */
    }
    return { success: true, payment: expose(await payment(id)) };
  } catch {
    await durable(() =>
      sql.query(
        "UPDATE providerPayments SET status='unknown',lastError='PAYOUT_REQUIRES_RECONCILIATION',updatedAt=NOW() WHERE id=? AND settled=0",
        [id],
      ),
    );
    return { error: "PAYOUT_REQUIRES_RECONCILIATION", status: 202 };
  }
}
async function deny(actor, id, body) {
  return durable(() =>
    actions.perform(actor, "provider.deny", id, body, async (connection) => {
      const snapshot = await payment(id);
      const [[user]] = await connection.query(
        "SELECT id,heldBalance FROM users WHERE id=? FOR UPDATE",
        [snapshot.userId],
      );
      const [[row]] = await connection.query(
        "SELECT * FROM providerPayments WHERE id=? FOR UPDATE",
        [id],
      );
      if (row.type !== "withdrawal" || row.status !== "queued")
        return { error: "PAYMENT_NOT_QUEUED", status: 409 };
      if (row.mode === "live") {
        if (Number(user.heldBalance) < Number(row.coins))
          throw fail("HELD_BALANCE_INVARIANT", 409);
        await connection.query(
          "UPDATE users SET balance=balance+?,heldBalance=heldBalance-? WHERE id=?",
          [row.coins, row.coins, row.userId],
        );
        await connection.query(
          "INSERT INTO transactions (userId,amount,type,method,methodId) VALUES (?,?,?,?,?)",
          [row.userId, row.coins, "in", row.provider + "-refund", row.id],
        );
      }
      await connection.query(
        "UPDATE providerPayments SET status='cancelled',settled=1,finalizedAt=NOW(),updatedAt=NOW() WHERE id=?",
        [id],
      );
      return {
        success: true,
        ...(row.mode === "live"
          ? { balanceUpdate: { userId: row.userId, amount: Number(row.coins) } }
          : {}),
      };
    }),
  );
}
async function flagDispute(provider, mode, settlementRef) {
  if (!settlementRef) return { ignored: true };
  // Retain verified events even when confirmation has not bound the capture yet.
  await durable(() =>
    sql.query(
      "INSERT IGNORE INTO providerDisputes (provider,mode,settlementRef) VALUES (?,?,?)",
      [provider, mode, settlementRef],
    ),
  );
  const [[snapshot]] = await sql.query(
    "SELECT id,userId FROM providerPayments WHERE provider=? AND mode=? AND settlementRef=? AND type='deposit'",
    [provider, mode, settlementRef],
  );
  if (!snapshot) return { ignored: true };
  return durable(() =>
    doTransaction(async (connection, commit) => {
      await connection.query("SELECT id FROM users WHERE id=? FOR UPDATE", [
        snapshot.userId,
      ]);
      const [[row]] = await connection.query(
        "SELECT * FROM providerPayments WHERE provider=? AND mode=? AND settlementRef=? AND type='deposit' FOR UPDATE",
        [provider, mode, settlementRef],
      );
      if (!row) {
        await commit();
        return { ignored: true };
      }
      if (row.mode === "live")
        await connection.query("UPDATE users SET accountLock=1 WHERE id=?", [
          row.userId,
        ]);
      await connection.query(
        "UPDATE providerPayments SET status='disputed',settled=1,lastError='PAYMENT_REQUIRES_FINANCE_REVIEW',updatedAt=NOW() WHERE id=?",
        [row.id],
      );
      await commit();
      return { success: true };
    }),
  );
}
module.exports = {
  approveEmailDeposit,
  rejectEmailDeposit,
  quote,
  payment,
  expose,
  create,
  settle,
  reconcile,
  accept,
  deny,
  assertAccess,
  flagDispute,
};
