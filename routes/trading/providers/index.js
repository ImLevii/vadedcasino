const express = require("express");
const { sql, doTransaction } = require("../../../database");
const { durable } = require("../../../runtime/cashier");
const { isAuthed, apiLimiter } = require("../../auth/functions");
const config = require("./config"),
  clients = require("./clients"),
  service = require("./service");
const router = express.Router();
const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res)).catch(next);
const id = (value) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1)
    throw config.fail("INVALID_PAYMENT_ID");
  return number;
};
router.get(
  "/",
  route(async (req, res) => {
    const providers = await Promise.all(
      Object.keys(config.definitions)
        .filter((id) => config.definitions[id].integrated)
        .map(async (provider) => {
          const c = await config.configuration(provider);
          return {
            id: provider,
            name: c.definition.name,
            mode: c.mode,
            depositFlow: c.depositFlow,
            deposits: {
              available: !config.availability(c, "deposit"),
              reason: config.availability(c, "deposit"),
              min: c.minDeposit,
              max: c.maxDeposit,
              percent: c.depositPercent,
              fixed: c.depositFixed,
            },
            withdrawals: {
              available: !config.availability(c, "withdrawal"),
              reason: config.availability(c, "withdrawal"),
              min: c.minWithdrawal,
              max: c.maxWithdrawal,
              percent: c.withdrawalPercent,
              fixed: c.withdrawalFixed,
            },
          };
        }),
    );
    res.json({
      providers,
      coinRate: require("../crypto/deposit/functions").cryptoData.coinRate,
    });
  }),
);
router.get(
  "/payments",
  isAuthed,
  route(async (req, res) => {
    const [[{ total }]] = await sql.query(
      "SELECT COUNT(*) AS total FROM providerPayments WHERE userId=?",
      [req.userId],
    );
    const pages = Math.max(1, Math.ceil(Number(total) / 20)),
      page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
    const [rows] = await sql.query(
      "SELECT * FROM providerPayments WHERE userId=? ORDER BY id DESC LIMIT 20 OFFSET ?",
      [req.userId, (page - 1) * 20],
    );
    res.json({
      data: rows.map(service.expose),
      total: Number(total),
      page,
      pages,
    });
  }),
);
router.get(
  "/payments/:id",
  isAuthed,
  route(async (req, res) =>
    res.json({
      payment: service.expose(
        await service.payment(id(req.params.id), req.userId),
      ),
    }),
  ),
);
router.post(
  "/payments/:id/reconcile", isAuthed, apiLimiter,
  route(async (req, res) => {
    const row = await service.payment(id(req.params.id), req.userId);
    await service.assertAccess(req.userId, await config.configuration(row.provider, row.mode));
    if (row.type !== "deposit") throw config.fail("INVALID_PAYMENT_TYPE");
    // PayPal approval still needs server-side capture before a deposit is paid.
    await service.reconcile(row, row.provider === "paypal");
    res.json({ success: true, payment: service.expose(await service.payment(row.id, req.userId)) });
  }),
);
for (const type of ["deposit", "withdrawal"])
  router.post(
    "/:provider/" + (type === "deposit" ? "deposits" : "withdrawals"),
    isAuthed,
    apiLimiter,
    route(async (req, res) => {
      res.json({
        success: true,
        payment: await service.create(
          req.userId,
          req.params.provider,
          type,
          req.body,
        ),
      });
    }),
  );
router.post(
  "/paypal/payments/:id/capture",
  isAuthed,
  apiLimiter,
  route(async (req, res) => {
    const row = await service.payment(id(req.params.id), req.userId);
    if (row.provider !== "paypal" || row.type !== "deposit")
      throw config.fail("INVALID_PAYMENT_TYPE");
    if (row.flow === "email") throw config.fail("PAYMENT_MANUAL_REVIEW_REQUIRED", 409);
    await service.assertAccess(
      req.userId,
      await config.configuration("paypal", row.mode),
    );
    await service.reconcile(row, true);
    res.json({
      success: true,
      payment: service.expose(await service.payment(row.id, req.userId)),
    });
  }),
);
router.get(
  "/stripe/account",
  isAuthed,
  route(async (req, res) => {
    const c = await config.configuration("stripe");
    await service.assertAccess(req.userId, c);
    const [[row]] = await sql.query(
      "SELECT accountId FROM providerAccounts WHERE userId=? AND provider='stripe' AND mode=?",
      [req.userId, c.mode],
    );
    if (!row?.accountId) return res.json({ ready: false });
    const account = await clients.request(
      c,
      "/v1/accounts/" + encodeURIComponent(row.accountId),
    );
    res.json({
      ready:
        account.payouts_enabled === true &&
        account.capabilities?.transfers === "active",
      accountId: row.accountId,
    });
  }),
);
router.post(
  "/stripe/connect",
  isAuthed,
  apiLimiter,
  route(async (req, res) => {
    const c = await config.configuration("stripe"),
      reason = config.availability(c, "withdrawal");
    if (reason) throw config.fail(reason, 503);
    await service.assertAccess(req.userId, c);
    const account = await durable(() =>
      doTransaction(async (connection, commit) => {
        await connection.query("SELECT id FROM users WHERE id=? FOR UPDATE", [
          req.userId,
        ]);
        const [[existing]] = await connection.query(
          "SELECT accountId,createdAt FROM providerAccounts WHERE userId=? AND provider='stripe' AND mode=? FOR UPDATE",
          [req.userId, c.mode],
        );
        if (!existing)
          await connection.query(
            "INSERT INTO providerAccounts (userId,provider,mode) VALUES (?,'stripe',?)",
            [req.userId, c.mode],
          );
        await commit();
        return existing || { createdAt: new Date() };
      }),
    );
    let accountId = account.accountId;
    if (!accountId) {
      if (Date.now() - new Date(account.createdAt).getTime() > 23 * 3600000)
        throw config.fail("STRIPE_ACCOUNT_REQUIRES_RECONCILIATION", 409);
      const remote = await clients.request(
        c,
        "/v1/accounts",
        "POST",
        {
          type: "express",
          country: c.connectCountry,
          capabilities: { transfers: { requested: true } },
          metadata: { userId: String(req.userId) },
        },
        "account-" + c.mode + "-" + req.userId,
      );
      if (!/^acct_[a-zA-Z0-9]+$/.test(remote.id || ""))
        throw config.fail("INVALID_PROVIDER_ACCOUNT", 503);
      accountId = remote.id;
      await durable(() =>
        sql.query(
          "UPDATE providerAccounts SET accountId=COALESCE(accountId,?) WHERE userId=? AND provider='stripe' AND mode=?",
          [accountId, req.userId, c.mode],
        ),
      );
    }
    const origin = config.publicOrigin(true, c),
      returnUrl = origin + "/withdraw?type=stripe";
    const link = await clients.request(c, "/v1/account_links", "POST", {
      account: accountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: returnUrl + "&onboarding=refresh",
    });
    res.json({ url: clients.safeCheckout(link.url, "stripe") });
  }),
);
router.post(
  "/:provider/webhook",
  route(async (req, res) => {
    const provider = req.params.provider;
    if (
      !Object.hasOwn(config.definitions, provider) ||
      !config.definitions[provider].integrated
    )
      throw config.fail("UNKNOWN_PAYMENT_PROVIDER", 404);
    const mode =
      config.definitions[provider].processor === "stripe"
        ? req.body.livemode
          ? "live"
          : "sandbox"
        : req.query.mode || "live";
    if (!["sandbox", "live"].includes(mode))
      throw config.fail("INVALID_PROVIDER_MODE");
    const c = await config.configuration(provider, mode);
    await clients.verifyWebhook(c, req);
    const event = req.body,
      type = event.type || event.event_type,
      resource = event.data?.object || event.resource;
    if (!resource || !event.id) throw config.fail("INVALID_PAYMENT_EVENT");
    if (
      config.isStripe(c) &&
      ["charge.refunded", "charge.dispute.created"].includes(type)
    ) {
      let intent = resource.payment_intent;
      if (!intent && resource.charge)
        intent = (
          await clients.request(
            c,
            "/v1/charges/" + encodeURIComponent(resource.charge),
          )
        ).payment_intent;
      await service.flagDispute(provider, mode, intent);
      return res.json({ received: true });
    }
    if (
      provider === "paypal" &&
      [
        "PAYMENT.CAPTURE.REFUNDED",
        "PAYMENT.CAPTURE.REVERSED",
        "CUSTOMER.DISPUTE.CREATED",
      ].includes(type)
    ) {
      const capture =
        resource.supplementary_data?.related_ids?.capture_id ||
        resource.disputed_transactions?.[0]?.seller_transaction_id ||
        resource.links
          ?.find((link) => link.rel === "up")
          ?.href?.match(/\/captures\/([A-Za-z0-9-]+)(?:[/?]|$)/)?.[1] ||
        (type === "PAYMENT.CAPTURE.REVERSED" ? resource.id : null);
      await service.flagDispute(provider, mode, capture);
      return res.json({ received: true });
    }
    let snapshot,
      ref,
      capture = false;
    if (
      config.isStripe(c) &&
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.expired",
      ].includes(type)
    ) {
      [[snapshot]] = await sql.query(
        "SELECT * FROM providerPayments WHERE provider=? AND mode=? AND type='deposit' AND requestId=?",
        [provider, mode, resource.metadata?.reference || ""],
      );
      ref = resource.id;
    } else if (provider === "stripe" && type === "transfer.created") {
      [[snapshot]] = await sql.query(
        "SELECT * FROM providerPayments WHERE provider='stripe' AND mode=? AND type='withdrawal' AND requestId=?",
        [mode, resource.metadata?.reference || ""],
      );
      ref = resource.id;
    } else if (
      provider === "paypal" &&
      ["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"].includes(type)
    ) {
      ref =
        type === "CHECKOUT.ORDER.APPROVED"
          ? resource.id
          : resource.supplementary_data?.related_ids?.order_id;
      if (!ref) throw config.fail("INVALID_PAYMENT_EVENT");
      const order = await clients.readDeposit(c, ref);
      [[snapshot]] = await sql.query(
        "SELECT * FROM providerPayments WHERE provider='paypal' AND mode=? AND type='deposit' AND requestId=?",
        [mode, order.purchase_units?.[0]?.custom_id || ""],
      );
      capture = type === "CHECKOUT.ORDER.APPROVED";
    } else if (
      provider === "paypal" &&
      type.startsWith("PAYMENT.PAYOUTS-ITEM.")
    ) {
      const reference = resource.payout_item?.sender_item_id;
      [[snapshot]] = await sql.query(
        "SELECT * FROM providerPayments WHERE provider='paypal' AND mode=? AND type='withdrawal' AND requestId=?",
        [mode, reference || ""],
      );
      ref = resource.payout_batch_id;
    } else return res.json({ received: true, ignored: true });
    if (!snapshot) return res.json({ received: true, ignored: true });
    if (snapshot.providerRef && snapshot.providerRef !== ref)
      throw config.fail("PAYMENT_IDENTITY_MISMATCH", 409);
    await service.reconcile(snapshot, capture, ref);
    res.json({ received: true });
  }),
);
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res
    .status(error.status || 503)
    .json({ error: error.code || "PAYMENT_SERVICE_UNAVAILABLE" });
});
module.exports = router;
