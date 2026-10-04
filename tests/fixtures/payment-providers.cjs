// Provider HTTP fixtures are only installed by the isolated PostgreSQL test process.
async function install(db, axios) {
  await db.query(
    `INSERT INTO users (id,username,role,perms,balance,xp,verified) VALUES (20,'Payment player','USER',4,100,10000,1),(21,'Credit rollback','USER',4,100,10000,1),(22,'Payment developer','DEV',0,0,0,0)`,
  );
  await db.exec(
    `CREATE FUNCTION reject_provider_credit() RETURNS trigger AS $$ BEGIN IF NEW.id = 21 AND NEW.balance > OLD.balance THEN RAISE EXCEPTION 'fixture credit failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql; CREATE TRIGGER provider_failed_credit BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION reject_provider_credit();`,
  );
  const calls = { orders: [], payouts: [], accounts: [], captures: [] },
    orders = new Map(),
    payouts = new Map(),
    accounts = new Map(),
    controls = {
      payoutTimeout: false,
      payoutStatus: "SUCCESS",
      checkoutTimeout: false,
      wrongAmount: false,
    };
  let sequence = 0;
  axios.request = async (options) => {
    const url = new URL(options.url),
      path = url.pathname,
      body =
        typeof options.data === "string"
          ? Object.fromEntries(new URLSearchParams(options.data))
          : options.data || {};
    if (path === "/v1/oauth2/token")
      return { data: { access_token: "fixture-oauth-token" } };
    if (path === "/v1/notifications/verify-webhook-signature")
      return {
        data: {
          verification_status:
            body.transmission_sig === "fixture-valid" ? "SUCCESS" : "FAILURE",
        },
      };
    if (path.startsWith("/v1/notifications/webhooks/"))
      return { data: { id: decodeURIComponent(path.split("/").at(-1)) } };
    if (path === "/v1/account")
      return { data: { id: "acct_platform_fixture" } };
    if (path === "/v1/checkout/sessions" && options.method !== "POST")
      return { data: { data: [...orders.values()].filter(row => row.metadata), has_more: false } };
    if (
      options.method === "POST" &&
      ["/v1/checkout/sessions", "/v2/checkout/orders"].includes(path)
    ) {
      const reference = path.includes("stripe")
        ? null
        : path === "/v1/checkout/sessions"
          ? body["metadata[reference]"]
          : body.purchase_units[0].custom_id;
      let existing = [...orders.values()].find(
        (order) =>
          (order.metadata?.reference ||
            order.purchase_units?.[0]?.custom_id) === reference,
      );
      if (!existing) {
        const stripe = path === "/v1/checkout/sessions",
          id = (stripe ? "cs_test_" : "ORDER-") + ++sequence;
        existing = stripe
          ? {
              id,
              livemode: /^Bearer (sk|rk)_live_/.test(options.headers?.Authorization || ""),
              metadata: {
                reference,
                userId: body["metadata[userId]"],
                paymentProvider: body["metadata[paymentProvider]"],
              },
              payment_method_types: [body["payment_method_types[0]"]],
              currency: "usd",
              amount_total: Number(
                body["line_items[0][price_data][unit_amount]"],
              ),
              payment_status: "unpaid",
              status: "open",
              payment_intent: "pi_fixture_" + sequence,
              url: "https://checkout.stripe.com/c/pay/" + id,
            }
          : {
              id,
              status: "APPROVED",
              purchase_units: body.purchase_units.map((unit) => ({
                ...unit,
                payee: { merchant_id: "fixture-merchant" },
              })),
              links: [
                {
                  rel: "payer-action",
                  href:
                    "https://www.sandbox.paypal.com/checkoutnow?token=" + id,
                },
              ],
            };
        orders.set(id, existing);
        calls.orders.push({
          reference,
          id,
          provider: existing.metadata
            ? existing.metadata.paymentProvider || "stripe"
            : "paypal",
          methods: existing.payment_method_types,
          returnUrl: body.success_url,
        });
      }
      if (controls.checkoutTimeout)
        throw Error("Simulated checkout response loss");
      return { data: existing };
    }
    const orderId = path.split("/")[4];
    if (path.startsWith("/v2/checkout/orders/") && path.endsWith("/capture")) {
      const order = orders.get(orderId);
      order.status = "COMPLETED";
      order.purchase_units[0].payments = {
        captures: [
          {
            id: "CAPTURE-" + orderId,
            status: "COMPLETED",
            amount: order.purchase_units[0].amount,
          },
        ],
      };
      calls.captures.push(orderId);
      return { data: order };
    }
    if (
      path.startsWith("/v2/checkout/orders/") ||
      path.startsWith("/v1/checkout/sessions/")
    ) {
      const order = orders.get(path.split("/").at(-1));
      if (!order) throw Error("Unknown fixture order");
      const copy = JSON.parse(JSON.stringify(order));
      if (controls.wrongMode && copy.metadata) copy.livemode = !copy.livemode;
      if (controls.wrongAmount) {
        if (copy.purchase_units) copy.purchase_units[0].amount.value = "0.01";
        else copy.amount_total = 1;
      }
      if (controls.wrongProvider && copy.metadata)
        copy.metadata.paymentProvider = "stripe";
      if (controls.wrongMethod && copy.metadata)
        copy.payment_method_types = ["card"];
      return { data: copy };
    }
    if (path === "/v1/accounts" && options.method === "POST") {
      const account = {
        id: "acct_fixture" + ++sequence,
        payouts_enabled: true,
        capabilities: { transfers: "active" },
        metadata: { userId: body["metadata[userId]"] },
      };
      accounts.set(account.id, account);
      calls.accounts.push(account.id);
      return { data: account };
    }
    if (path.startsWith("/v1/accounts/"))
      return { data: accounts.get(path.split("/").at(-1)) };
    if (path === "/v1/account_links")
      return { data: { url: "https://connect.stripe.com/setup/fixture" } };
    if (
      options.method === "POST" &&
      ["/v1/transfers", "/v1/payments/payouts"].includes(path)
    ) {
      if (require("../../runtime/context").storage.getStore())
        throw Error("Provider payout was inside a transaction");
      const reference =
        path === "/v1/transfers"
          ? body["metadata[reference]"]
          : body.sender_batch_header.sender_batch_id;
      const [[claim]] = await require("../../database").sql.query(
        "SELECT status FROM providerPayments WHERE requestId=?",
        [reference],
      );
      if (claim.status !== "sending")
        throw Error("Provider payout claim was not committed");
      const id =
        (path === "/v1/transfers" ? "tr_fixture" : "BATCH-") + ++sequence;
      const remote =
        path === "/v1/transfers"
          ? {
              id,
              livemode: /^Bearer (sk|rk)_live_/.test(options.headers?.Authorization || ""),
              metadata: { reference },
              destination: body.destination,
              amount: Number(body.amount),
              currency: "usd",
              reversed: false,
              amount_reversed: 0,
            }
          : {
              batch_header: {
                payout_batch_id: id,
                sender_batch_header: body.sender_batch_header,
              },
              items: body.items.map((item) => ({
                payout_item: item,
                payout_item_id: "ITEM-" + id,
                transaction_status: controls.payoutStatus,
              })),
            };
      payouts.set(id, remote);
      calls.payouts.push({ reference, id });
      if (controls.payoutTimeout) throw Error("Simulated payout response loss");
      return { data: remote };
    }
    if (path === "/v1/transfers")
      return {
        data: {
          data: [...payouts.values()].filter((row) => row.id),
          has_more: false,
        },
      };
    if (
      path.startsWith("/v1/transfers/") ||
      path.startsWith("/v1/payments/payouts/")
    ) {
      const remote = payouts.get(path.split("/").at(-1));
      if (!remote) throw Error("Unknown fixture payout");
      return { data: remote };
    }
    throw Error("Unexpected provider fixture request: " + path);
  };
  function handle(req, res) {
    if (
      req.url !== "/__test/providers" &&
      req.url !== "/__test/provider-control"
    )
      return false;
    if (req.url === "/__test/provider-control") {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        const body = JSON.parse(raw || "{}");
        Object.assign(controls, body);
        if (body.paidStripe)
          for (const row of orders.values())
            if (row.metadata) {
              row.payment_status = "paid";
              row.status = "complete";
            }
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ success: true }));
      });
      return true;
    }
    require("../../runtime/serverless")
      .run(
        async () => {
          const { sql } = require("../../database");
          const [users] = await sql.query(
            "SELECT id,balance,heldBalance,accountLock FROM users WHERE id IN (1,20,21) ORDER BY id",
          );
          const [payments] = await sql.query(
            "SELECT * FROM providerPayments ORDER BY id",
          );
          const [providers] = await sql.query("SELECT * FROM paymentProviders");
          const [ledger] = await sql.query(
            "SELECT * FROM transactions WHERE method IN ('paypal','stripe','applepay','cashapp','paypal-hold','paypal-refund','stripe-hold','stripe-refund')",
          );
          return { users, payments, providers, ledger, calls };
        },
        { scopes: ["admin"] },
      )
      .then(
        (value) => {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(value));
        },
        (error) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: error.message }));
        },
      );
    return true;
  }
  return { handle };
}
module.exports = { install };
