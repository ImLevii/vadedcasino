const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const { randomUUID, createHmac } = require("node:crypto");
const jwt = require("jsonwebtoken");

test(
  "payment providers: encrypted controls, verified settlement, sandbox isolation and durable payouts",
  { timeout: 90000 },
  async (t) => {
    const listener = net.createServer().listen(0, "127.0.0.1");
    await once(listener, "listening");
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    const secret = "provider-test-jwt-secret-longer-than-thirty-two-characters";
    const child = spawn(process.execPath, ["tests/fixtures/postgres-app.cjs"], {
      env: {
        ...process.env,
        VERCEL: "1",
        PROVIDERS_TEST: "1",
        CASHIER_TEST: "",
        OPERATIONS_TEST: "",
        NODE_ENV: "production",
        PORT: String(port),
        SQL_DIALECT: "postgres",
        DATABASE_URL: "postgres://test:test@localhost/test",
        JWT_SECRET: secret,
        PAYMENT_SETTINGS_KEY: "",
        BASE_URL: "",
        FRONTEND_URL: "",
        DISCORD_BOT_TOKEN: "",
        STRIPE_SECRET_KEY: "",
        PAYPAL_CLIENT_ID: "",
        PAYPAL_CLIENT_SECRET: "",
        MEXC_API_KEY: "",
        MEXC_API_SECRET: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        output += chunk;
        if (process.env.DEBUG_TEST) process.stdout.write(chunk);
      });
    t.after(async () => {
      if (child.exitCode === null) {
        child.kill();
        await once(child, "exit");
      }
    });
    const origin = "http://127.0.0.1:" + port;
    for (let i = 0; i < 150; i++) {
      try {
        if ((await fetch(origin + "/readyz")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    const tokens = new Map(),
      writes = new Map();
    async function request(
      path,
      body,
      actor = 1,
      method = body ? "POST" : "GET",
    ) {
      if (!tokens.has(actor))
        tokens.set(actor, jwt.sign({ uid: String(actor) }, secret));
      if (method === "POST" && path.startsWith("/trading/")) {
        const key = actor + ":" + path,
          wait = 310 - (Date.now() - (writes.get(key) || 0));
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        writes.set(key, Date.now());
      }
      const response = await fetch(origin + path, {
        method,
        headers: {
          authorization: tokens.get(actor),
          "content-type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = { ...(await response.json()), httpStatus: response.status };
      if (method === "POST" && path.startsWith("/trading/")) writes.set(actor + ":" + path, Date.now());
      return result;
    }
    const state = () => request("/__test/providers"),
      control = (body) => request("/__test/provider-control", body);
    const action = (extra) => ({
      requestId: randomUUID(),
      reason: "Payment provider regression verification",
      ...extra,
    });
    const getProvider = async (id) => {
      const response = await request("/admin/cashier/providers");
      assert.ok(response.providers, JSON.stringify(response) + " " + output);
      return response.providers.find((p) => p.id === id);
    };
    const setup = async (id, settings = {}, credentials = {}) => {
      const current = await getProvider(id);
      return request(
        "/admin/cashier/providers/" + id,
        action({
          version: current.version,
          settings: { ...current.settings, apiOrigin: "https://payments.test", frontendOrigin: "https://frontend.payments.test", ...settings },
          credentials,
        }),
        1,
        "PUT",
      );
    };
    const paypalKeys = {
      clientId: "fixture-client",
      clientSecret: "super-secret-paypal-fixture",
      merchantId: "fixture-merchant",
      webhookId: "fixture-webhook",
    };
    const stripeKeys = {
      secretKey: "sk_test_super_secret_fixture",
      webhookSecret: "whsec_fixture_super_secret",
    };
    const webhookSecrets = {
      stripe: stripeKeys.webhookSecret,
      applepay: "whsec_applepay_fixture",
      cashapp: "whsec_cashapp_fixture",
    };
    assert.equal(
      (await request("/admin/cashier/providers")).error,
      "2FA_REQUIRED",
      output,
    );
    assert.equal((await request("/admin/2fa", {})).success, true, output);
    assert.equal((await request("/admin/2fa", {}, 22)).success, true);
    assert.equal(
      (await request("/admin/cashier/providers", undefined, 22)).httpStatus,
      403,
    );
    const initial = await getProvider("paypal");
    const adminProviders = await request("/admin/cashier/providers");
    assert.deepEqual(adminProviders.providers.map((p) => p.id).sort(), [
      "applepay",
      "cashapp",
      "giftcards",
      "paypal",
      "skindeck",
      "stripe",
    ]);
    for (const provider of ["coinpayments", "mexc", "zebra"]) {
      assert.equal(
        (
          await request(
            "/admin/cashier/providers/" + provider,
            action(),
            1,
            "PUT",
          )
        ).httpStatus,
        410,
      );
      assert.equal(
        (await request("/admin/cashier/providers/" + provider + "/check", {}))
          .httpStatus,
        410,
      );
    }
    for (const path of [
      "/trading/crypto/deposit/wallet",
      "/trading/crypto/withdraw",
      "/trading/deposit/cc",
      "/trading/CRYPTO/WITHDRAW/",
      "/trading/DEPOSIT/CC/",
    ])
      assert.equal(
        (await request(path, { requestId: randomUUID(), amount: 10 })).error,
        "PAYMENT_PROVIDER_REMOVED",
      );
    for (const path of [
      "/trading/crypto/deposit",
      "/trading/crypto/withdraw",
      "/trading/deposit/cc",
    ])
      assert.equal((await request(path)).reason, "PAYMENT_PROVIDER_REMOVED");
    assert.equal(
      (await request("/admin/features/cryptoDeposits", { enable: true }))
        .httpStatus,
      410,
    );
    assert.equal(initial.settings.depositsEnabled, false);
    assert.equal(initial.canStoreSecrets, true);
    const configBody = action({
      version: initial.version,
      settings: {
        ...initial.settings,
        depositFlow: "api",
        apiOrigin: "https://payments.test",
        frontendOrigin: "https://frontend.payments.test",
        depositsEnabled: true,
        withdrawalsEnabled: true,
      },
      credentials: paypalKeys,
    });
    const saved = await request(
      "/admin/cashier/providers/paypal",
      configBody,
      1,
      "PUT",
    );
    assert.equal(saved.success, true, JSON.stringify(saved) + " " + output);
    assert.equal(
      (await request("/admin/cashier/providers/paypal", configBody, 1, "PUT"))
        .replayed,
      true,
    );
    assert.equal(
      (
        await request(
          "/admin/cashier/providers/paypal",
          { ...configBody, requestId: randomUUID() },
          1,
          "PUT",
        )
      ).error,
      "STALE_PROVIDER_SETTINGS",
    );
    assert.equal(
      (
        await setup(
          "stripe",
          { depositsEnabled: true, withdrawalsEnabled: true },
          stripeKeys,
        )
      ).success,
      true,
    );
    assert.equal((await setup("stripe", { mode: "live" })).success, true);
    assert.equal((await getProvider("stripe")).deposits.reason, "PAYMENT_PROVIDER_UNCONFIGURED");
    assert.equal((await setup("stripe", { mode: "sandbox" })).success, true);
    assert.equal(
      (
        await setup(
          "paypal",
          { mode: "live", merchantApproval: "" },
          paypalKeys,
        )
      ).success,
      true,
    );
    assert.equal((await setup("paypal", { mode: "sandbox" })).success, true);
    const presentation = JSON.stringify(
      await request("/admin/cashier/providers"),
    );
    assert.ok(!presentation.includes(paypalKeys.clientSecret));
    assert.ok(!presentation.includes(stripeKeys.secretKey));
    assert.ok(
      !(await state()).providers[0].credentials.includes(
        paypalKeys.clientSecret,
      ),
    );
    assert.equal(
      (await request("/admin/cashier/providers/paypal/check", {})).success,
      true,
    );
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/deposits",
          { requestId: randomUUID(), amount: 15 },
          20,
        )
      ).error,
      "PAYMENT_TEST_MODE_STAFF_ONLY",
    );

    const staffBalance = (await state()).users.find((u) => u.id === 1).balance;
    const stripeRequest = { requestId: randomUUID(), amount: 15 };
    const stripe = await request(
      "/trading/providers/stripe/deposits",
      stripeRequest,
    );
    assert.equal(
      stripe.success,
      true,
      JSON.stringify(stripe) +
        " " +
        JSON.stringify((await state()).payments) +
        " " +
        output,
    );
    assert.equal(stripe.payment.fiatCents, 1050);
    await new Promise((r) => setTimeout(r, 310));
    const stripeRetry = await request(
      "/trading/providers/stripe/deposits",
      stripeRequest,
    );
    assert.equal(stripeRetry.payment.id, stripe.payment.id);
    async function stripeEvent(
      row,
      valid = true,
      type = "checkout.session.completed",
      resource,
    ) {
      const raw = JSON.stringify({
        id: "evt_" + randomUUID(),
        type,
        livemode: row.mode === "live",
        data: {
          object: resource || {
            id: row.providerRef,
            metadata: { reference: row.requestId },
          },
        },
      });
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = createHmac(
        "sha256",
        valid ? webhookSecrets[row.provider] : "wrong-secret",
      )
        .update(timestamp + "." + raw)
        .digest("hex");
      const response = await fetch(
        origin + "/trading/providers/" + row.provider + "/webhook",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "stripe-signature": `t=${timestamp},v1=${signature}`,
          },
          body: raw,
        },
      );
      return { ...(await response.json()), httpStatus: response.status };
    }
    assert.equal((await stripeEvent(stripe.payment, false)).httpStatus, 403);
    assert.equal((await stripeEvent(stripe.payment)).received, true);
    assert.equal(
      (await state()).payments.find((p) => p.id === stripe.payment.id).settled,
      0,
    );
    await control({ paidStripe: true });
    await Promise.all([
      stripeEvent(stripe.payment),
      stripeEvent(stripe.payment),
    ]);
    assert.equal(
      (await state()).users.find((u) => u.id === 1).balance,
      staffBalance,
    );
    assert.equal(
      (await state()).ledger.filter((row) => row.method === "stripe").length,
      0,
    );
    for (const provider of ["applepay", "cashapp"]) {
      const wallet = await getProvider(provider);
      assert.equal(wallet.withdrawals.supported, false);
      assert.equal((await setup(provider, { mode: "live" })).success, true);
      assert.equal((await setup(provider, { mode: "sandbox" })).success, true);
      assert.equal(
        (await setup(provider, { withdrawalsEnabled: true })).error,
        "PAYMENT_DIRECTION_UNSUPPORTED",
      );
      assert.equal(
        (
          await setup(
            provider,
            { depositsEnabled: true },
            { ...stripeKeys, webhookSecret: webhookSecrets[provider] },
          )
        ).success,
        true,
      );
      assert.equal(
        (
          await request(
            "/trading/providers/" + provider + "/deposits",
            { requestId: randomUUID(), amount: 15 },
            20,
          )
        ).error,
        "PAYMENT_TEST_MODE_STAFF_ONLY",
      );
      assert.equal(
        (
          await request("/trading/providers/" + provider + "/withdrawals", {
            requestId: randomUUID(),
            amount: 15,
          })
        ).error,
        "PAYMENT_DIRECTION_UNSUPPORTED",
      );
      const walletRequest = { requestId: randomUUID(), amount: 15 };
      const checkout = await request(
        "/trading/providers/" + provider + "/deposits",
        walletRequest,
      );
      assert.equal(checkout.success, true, JSON.stringify(checkout));
      const remoteCall = (await state()).calls.orders.find(
        (p) => p.reference === walletRequest.requestId,
      );
      assert.deepEqual(remoteCall.methods, [
        provider === "cashapp" ? "cashapp" : "card",
      ]);
      assert.match(remoteCall.returnUrl, new RegExp("type=" + provider));
      assert.equal(
        (await stripeEvent(checkout.payment, false)).httpStatus,
        403,
      );
      assert.equal(
        (
          await stripeEvent({
            ...checkout.payment,
            provider: provider === "applepay" ? "stripe" : "applepay",
          })
        ).ignored,
        true,
      );
      await control({ paidStripe: true, wrongProvider: true });
      assert.equal(
        (await stripeEvent(checkout.payment)).error,
        "PAYMENT_IDENTITY_MISMATCH",
      );
      await control({ wrongProvider: false });
      if (provider === "cashapp") {
        await control({ wrongMethod: true });
        assert.equal(
          (await stripeEvent(checkout.payment)).error,
          "PAYMENT_IDENTITY_MISMATCH",
        );
        await control({ wrongMethod: false });
      }
      assert.equal(
        (await setup(provider, { depositsEnabled: false })).success,
        true,
      );
      await Promise.all([
        stripeEvent(checkout.payment),
        stripeEvent(checkout.payment),
      ]);
      const settled = await state();
      assert.equal(
        settled.payments.find((p) => p.id === checkout.payment.id).status,
        "completed",
      );
      assert.equal(settled.users.find((p) => p.id === 1).balance, staffBalance);
      assert.equal(settled.users.find((p) => p.id === 1).heldBalance, 0);
      assert.equal(
        settled.ledger.filter((p) => p.method === provider).length,
        0,
      );
      const filtered = await request(
        "/admin/cashier/providers/transactions?provider=" +
          provider +
          "&mode=sandbox",
      );
      assert.equal(filtered.total, 1);
    }
    const connected = await request("/trading/providers/stripe/connect", {});
    assert.match(connected.url, /^https:\/\/connect.stripe.com/);
    const stripeWithdrawal = await request(
      "/trading/providers/stripe/withdrawals",
      { requestId: randomUUID(), amount: 15 },
    );
    assert.equal(stripeWithdrawal.payment.status, "queued");
    const approve = action();
    assert.equal(
      (
        await request(
          "/admin/cashier/providers/transactions/" +
            stripeWithdrawal.payment.id +
            "/accept",
          approve,
        )
      ).success,
      true,
    );
    const replay = await request(
      "/admin/cashier/providers/transactions/" +
        stripeWithdrawal.payment.id +
        "/accept",
      approve,
    );
    assert.equal(replay.replayed, true, JSON.stringify(replay) + " " + output);
    assert.equal(
      (await state()).users.find((u) => u.id === 1).balance,
      staffBalance,
    );

    assert.equal(
      (
        await setup(
          "paypal",
          { mode: "live", merchantApproval: "Approved fixture merchant" },
          paypalKeys,
        )
      ).success,
      true,
    );
    const deposit = await request(
      "/trading/providers/paypal/deposits",
      { requestId: randomUUID(), amount: 20 },
      20,
    );
    assert.equal(deposit.success, true, JSON.stringify(deposit) + " " + output);
    assert.equal((await state()).users.find((u) => u.id === 20).balance, 100);
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/payments/" +
            deposit.payment.id +
            "/capture",
          {},
          21,
        )
      ).httpStatus,
      404,
    );
    const capture = await request(
      "/trading/providers/paypal/payments/" + deposit.payment.id + "/capture",
      {},
      20,
    );
    assert.equal(capture.success, true, JSON.stringify(capture) + " " + output);
    async function paypalEvent(
      row,
      type = "PAYMENT.CAPTURE.COMPLETED",
      valid = true,
      resource,
    ) {
      const response = await fetch(
        origin + "/trading/providers/paypal/webhook?mode=live",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "paypal-transmission-sig": valid
              ? "fixture-valid"
              : "wrong-signature",
            "paypal-transmission-id": randomUUID(),
            "paypal-transmission-time": new Date().toISOString(),
            "paypal-cert-url": "https://api.paypal.com/fixture-cert",
            "paypal-auth-algo": "SHA256withRSA",
          },
          body: JSON.stringify({
            id: "WH-" + randomUUID(),
            event_type: type,
            resource: resource || {
              id: "CAPTURE-" + row.providerRef,
              supplementary_data: {
                related_ids: { order_id: row.providerRef },
              },
            },
          }),
        },
      );
      return { ...(await response.json()), httpStatus: response.status };
    }
    assert.equal(
      (await paypalEvent(deposit.payment, "PAYMENT.CAPTURE.COMPLETED", false))
        .httpStatus,
      403,
    );
    await Promise.all([
      paypalEvent(deposit.payment),
      paypalEvent(deposit.payment),
    ]);
    let snapshot = await state();
    assert.equal(snapshot.users.find((u) => u.id === 20).balance, 120);
    assert.equal(
      snapshot.ledger.filter(
        (row) => row.method === "paypal" && row.type === "deposit",
      ).length,
      1,
    );
    const bad = await request(
      "/trading/providers/paypal/deposits",
      { requestId: randomUUID(), amount: 10 },
      20,
    );
    await control({ wrongAmount: true });
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/payments/" + bad.payment.id + "/capture",
          {},
          20,
        )
      ).error,
      "PAYMENT_IDENTITY_MISMATCH",
    );
    await control({ wrongAmount: false });
    const rollback = await request(
      "/trading/providers/paypal/deposits",
      { requestId: randomUUID(), amount: 10 },
      21,
    );
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/payments/" +
            rollback.payment.id +
            "/capture",
          {},
          21,
        )
      ).httpStatus,
      503,
    );
    snapshot = await state();
    assert.equal(snapshot.users.find((u) => u.id === 21).balance, 100);
    assert.equal(
      snapshot.payments.find((p) => p.id === rollback.payment.id).settled,
      0,
    );
    assert.equal(snapshot.ledger.filter((row) => row.userId === 21).length, 0);
    assert.equal(
      (await setup("paypal", {}, { clientSecret: "rotated-too-early" })).error,
      "CREDENTIAL_ROTATION_HAS_OPEN_PAYMENTS",
    );
    const late = await request(
      "/trading/providers/paypal/deposits",
      { requestId: randomUUID(), amount: 10 },
      20,
    );
    assert.equal(
      (await setup("paypal", { depositsEnabled: false })).success,
      true,
    );
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/deposits",
          { requestId: randomUUID(), amount: 10 },
          20,
        )
      ).error,
      "DISABLED",
    );
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/payments/" + late.payment.id + "/capture",
          {},
          20,
        )
      ).success,
      true,
    );
    assert.equal((await state()).users.find((u) => u.id === 20).balance, 130);

    const withdrawRequest = {
      requestId: randomUUID(),
      amount: 20,
      receiver: "PLAYER@example.com",
    };
    const withdrawal = await request(
      "/trading/providers/paypal/withdrawals",
      withdrawRequest,
      20,
    );
    assert.equal(
      withdrawal.success,
      true,
      JSON.stringify(withdrawal) + " " + output,
    );
    snapshot = await state();
    assert.equal(snapshot.users.find((u) => u.id === 20).balance, 110);
    assert.equal(snapshot.users.find((u) => u.id === 20).heldBalance, 20);
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/withdrawals",
          {
            requestId: randomUUID(),
            amount: 10,
            receiver: "player@example.com",
          },
          20,
        )
      ).error,
      "PENDING_WITHDRAWAL",
    );
    await control({ payoutTimeout: true });
    const uncertain = await request(
      "/admin/cashier/providers/transactions/" +
        withdrawal.payment.id +
        "/accept",
      action(),
    );
    assert.equal(uncertain.error, "PAYOUT_REQUIRES_RECONCILIATION");
    snapshot = await state();
    assert.equal(
      snapshot.payments.find((p) => p.id === withdrawal.payment.id).status,
      "unknown",
    );
    assert.equal(snapshot.users.find((u) => u.id === 20).heldBalance, 20);
    assert.equal(
      (
        await request(
          "/admin/cashier/providers/transactions/" +
            withdrawal.payment.id +
            "/accept",
          action(),
        )
      ).error,
      "PAYMENT_NOT_QUEUED",
    );
    assert.equal(
      (
        await request(
          "/admin/cashier/providers/transactions/" +
            withdrawal.payment.id +
            "/reconcile",
          action(),
        )
      ).error,
      "PAYOUT_NOT_CONFIRMED_KEEP_RESERVED",
    );
    const remote = snapshot.calls.payouts.find(
        (p) => p.reference === withdrawRequest.requestId,
      ),
      payoutResource = {
        payout_item: { sender_item_id: withdrawRequest.requestId },
        payout_batch_id: remote.id,
      };
    await Promise.all([
      paypalEvent(
        withdrawal.payment,
        "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
        true,
        payoutResource,
      ),
      paypalEvent(
        withdrawal.payment,
        "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
        true,
        payoutResource,
      ),
    ]);
    snapshot = await state();
    assert.equal(snapshot.users.find((u) => u.id === 20).balance, 110);
    assert.equal(snapshot.users.find((u) => u.id === 20).heldBalance, 0);
    assert.equal(
      snapshot.payments.find((p) => p.id === withdrawal.payment.id).status,
      "completed",
    );
    assert.equal(
      snapshot.calls.payouts.filter(
        (p) => p.reference === withdrawRequest.requestId,
      ).length,
      1,
    );
    await control({ payoutTimeout: false });
    await new Promise((r) => setTimeout(r, 310));
    const denied = await request(
      "/trading/providers/paypal/withdrawals",
      { requestId: randomUUID(), amount: 10, receiver: "player@example.com" },
      20,
    );
    assert.equal(denied.success, true);
    const deniedAction = action();
    await Promise.all([
      request(
        "/admin/cashier/providers/transactions/" + denied.payment.id + "/deny",
        deniedAction,
      ),
      request(
        "/admin/cashier/providers/transactions/" + denied.payment.id + "/deny",
        deniedAction,
      ),
    ]);
    snapshot = await state();
    assert.equal(snapshot.users.find((u) => u.id === 20).balance, 110);
    assert.equal(snapshot.users.find((u) => u.id === 20).heldBalance, 0);
    assert.equal(
      snapshot.ledger.filter(
        (row) =>
          row.method === "paypal-refund" && row.methodId === denied.payment.id,
      ).length,
      1,
    );
    assert.equal(
      (
        await request(
          "/admin/cashier/providers/transactions?provider=paypal&type=withdrawal&mode=live",
        )
      ).total,
      2,
    );
    const audit = await request("/admin/cashier/providers/audit");
    assert.ok(
      audit.data.some((row) => row.action === "provider.configure.paypal"),
    );
    assert.ok(audit.data.some((row) => row.action === "provider.accept"));
    assert.ok(!JSON.stringify(audit).includes(paypalKeys.clientSecret));
    const publicResponse = JSON.stringify(await request("/trading/providers"));
    assert.ok(!publicResponse.includes(paypalKeys.clientSecret));
    assert.ok(!publicResponse.includes(stripeKeys.webhookSecret));
    assert.equal(
      (
        await request(
          "/trading/providers/payments/" + deposit.payment.id,
          undefined,
          21,
        )
      ).httpStatus,
      404,
    );
    // A signed refund can precede the capture confirmation that binds its ID.
    assert.equal(
      (await setup("paypal", { depositsEnabled: true })).success,
      true,
    );
    const refunded = await request(
      "/trading/providers/paypal/deposits",
      { requestId: randomUUID(), amount: 8 },
      20,
    );
    assert.equal(refunded.success, true, JSON.stringify(refunded));
    assert.equal(
      (
        await paypalEvent(refunded.payment, "PAYMENT.CAPTURE.REFUNDED", true, {
          id: "REFUND-fixture",
          supplementary_data: {
            related_ids: {
              capture_id: "CAPTURE-" + refunded.payment.providerRef,
            },
          },
        })
      ).received,
      true,
    );
    assert.equal(
      (
        await request(
          "/trading/providers/paypal/payments/" +
            refunded.payment.id +
            "/capture",
          {},
          20,
        )
      ).success,
      true,
    );
    await paypalEvent(refunded.payment);
    snapshot = await state();
    assert.equal(snapshot.users.find((u) => u.id === 20).balance, 110);
    assert.equal(snapshot.users.find((u) => u.id === 20).accountLock, 1);
    assert.equal(
      snapshot.payments.find((p) => p.id === refunded.payment.id).status,
      "disputed",
    );
    assert.equal(
      snapshot.ledger.filter(
        (p) => p.method === "paypal" && p.methodId === refunded.payment.id,
      ).length,
      0,
    );

    const earlyStripe = await request("/trading/providers/stripe/deposits", {
      requestId: randomUUID(),
      amount: 10,
    });
    const intent =
      "pi_fixture_" + earlyStripe.payment.providerRef.replace("cs_test_", "");
    assert.equal(
      (
        await stripeEvent(earlyStripe.payment, true, "charge.refunded", {
          payment_intent: intent,
        })
      ).received,
      true,
    );
    await control({ paidStripe: true });
    assert.equal((await stripeEvent(earlyStripe.payment)).received, true);
    snapshot = await state();
    assert.equal(
      snapshot.payments.find((p) => p.id === earlyStripe.payment.id).status,
      "disputed",
    );
    assert.equal(snapshot.users.find((u) => u.id === 1).balance, staffBalance);
    assert.equal(snapshot.users.find((u) => u.id === 1).accountLock, 0);

    // Loss of a checkout response retries the original remote order, never a new one.
    const lostRequest = { requestId: randomUUID(), amount: 10 };
    await control({ checkoutTimeout: true });
    assert.equal(
      (await request("/trading/providers/stripe/deposits", lostRequest)).error,
      "PAYMENT_REQUIRES_RECONCILIATION",
    );
    await control({ checkoutTimeout: false });
    const lostRow = (await state()).payments.find(row => row.requestId === lostRequest.requestId);
    assert.equal(lostRow.status, "unknown");
    const recoveryPath = "/trading/providers/payments/" + lostRow.id + "/reconcile";
    assert.equal((await request(recoveryPath, {}, 20)).httpStatus, 404);
    const recoveredExisting = await request(recoveryPath, {});
    assert.equal(recoveredExisting.success, true, JSON.stringify(recoveredExisting));
    assert.equal(recoveredExisting.payment.status, "awaiting_payment");
    assert.ok(recoveredExisting.payment.checkoutUrl);
    assert.equal((await state()).users.find(row => row.id === 1).balance, staffBalance);
    const recovered = await request(
      "/trading/providers/stripe/deposits",
      lostRequest,
    );
    assert.equal(recovered.success, true);
    snapshot = await state();
    assert.equal(
      snapshot.calls.orders.filter((p) => p.reference === lostRequest.requestId)
        .length,
      1,
    );
    assert.equal(
      snapshot.payments.filter((p) => p.requestId === lostRequest.requestId)
        .length,
      1,
    );
    // Live keys remain separate from sandbox; only verified, matching settlements credit.
    for (const provider of ["stripe", "applepay", "cashapp"]) {
      assert.equal((await setup(provider, { mode: "live" }, stripeKeys)).error, "STRIPE_KEY_MODE_MISMATCH");
      assert.equal((await setup(provider, { mode: "live", depositsEnabled: true }, {
        secretKey: provider === "cashapp" ? "rk_live_mock_fixture" : "sk_live_mock_fixture", webhookSecret: webhookSecrets[provider],
      })).success, true);
      const configured = await getProvider(provider);
      assert.equal(configured.deposits.available, true);
      assert.ok(configured.credentials.every(field => field.source === "admin"));
      const before = (await state()).users.find(user => user.id === 1).balance;
      const live = await request("/trading/providers/" + provider + "/deposits", { requestId: randomUUID(), amount: 15 });
      assert.equal(live.success, true, JSON.stringify(live));
      assert.equal(live.payment.mode, "live");
      const call = (await state()).calls.orders.find(order => order.reference === live.payment.requestId);
      assert.ok(call.returnUrl.startsWith("https://frontend.payments.test/deposit"));
      const reconciliationPath = "/trading/providers/payments/" + live.payment.id + "/reconcile";
      assert.equal((await request(reconciliationPath, {})).payment.status, "awaiting_payment");
      assert.equal((await state()).users.find(user => user.id === 1).balance, before);
      assert.equal((await request(reconciliationPath, {}, 20)).httpStatus, 404);
      await control({ paidStripe: true, wrongMode: true });
      await stripeEvent(live.payment);
      assert.equal((await request(reconciliationPath, {})).error, "PAYMENT_IDENTITY_MISMATCH");
      assert.equal((await state()).users.find(user => user.id === 1).balance, before);
      await control({ wrongMode: false });
      // The return/status recovery credits even if no webhook has arrived.
      const recovered = await request(reconciliationPath, {});
      assert.equal(recovered.payment.status, "completed");
      await Promise.all([stripeEvent(live.payment), stripeEvent(live.payment), request(reconciliationPath, {})]);
      const settled = await state();
      assert.equal(settled.users.find(user => user.id === 1).balance, before + 15);
      assert.equal(settled.ledger.filter(row => row.method === provider && row.methodId === live.payment.id).length, 1);
      // A completed checkout with an unpaid async payment must wait for success.
      const delayed = await request("/trading/providers/" + provider + "/deposits", { requestId: randomUUID(), amount: 11 });
      assert.equal(delayed.success, true);
      assert.equal((await stripeEvent(delayed.payment)).received, true);
      assert.equal((await state()).users.find(user => user.id === 1).balance, before + 15);
      await control({ paidStripe: true });
      assert.equal((await stripeEvent(delayed.payment, true, "checkout.session.async_payment_succeeded")).received, true);
      assert.equal((await request("/trading/providers/payments/" + delayed.payment.id + "/reconcile", {})).payment.status, "completed");
      const delayedState = await state();
      assert.equal(delayedState.users.find(user => user.id === 1).balance, before + 26);
      assert.equal(delayedState.ledger.filter(row => row.method === provider && row.methodId === delayed.payment.id).length, 1);
      assert.equal((await setup(provider, { mode: "sandbox" })).success, true);
      assert.ok((await getProvider(provider)).credentials.every(field => field.configured));
    }
    assert.equal((await setup("paypal", { mode: "live", depositFlow: "api", depositsEnabled: true }, paypalKeys)).success, true);
    const paypalBefore = (await state()).users.find(user => user.id === 1).balance;
    const paypalRecovery = await request("/trading/providers/paypal/deposits", { requestId: randomUUID(), amount: 13 });
    assert.equal(paypalRecovery.success, true);
    const paypalRecoveryPath = "/trading/providers/payments/" + paypalRecovery.payment.id + "/reconcile";
    const capturesBefore = (await state()).calls.captures.length;
    await control({ wrongAmount: true });
    assert.equal((await request(paypalRecoveryPath, {})).error, "PAYMENT_IDENTITY_MISMATCH");
    assert.equal((await state()).calls.captures.length, capturesBefore);
    assert.equal((await state()).users.find(user => user.id === 1).balance, paypalBefore);
    await control({ wrongAmount: false });
    assert.equal((await request(paypalRecoveryPath, {})).payment.status, "completed");
    await Promise.all([paypalEvent(paypalRecovery.payment), request(paypalRecoveryPath, {})]);
    const paypalRecoveredState = await state();
    assert.equal(paypalRecoveredState.users.find(user => user.id === 1).balance, paypalBefore + 13);
    assert.equal(paypalRecoveredState.calls.captures.length, capturesBefore + 1);
    assert.equal(paypalRecoveredState.ledger.filter(row => row.method === "paypal" && row.methodId === paypalRecovery.payment.id).length, 1);
    assert.equal((await setup("stripe", { mode: "live", withdrawalsEnabled: true })).success, true);
    const balanceBeforePayout = (await state()).users.find(user => user.id === 1).balance;
    assert.equal((await request("/trading/providers/stripe/account")).ready, false);
    assert.match((await request("/trading/providers/stripe/connect", {})).url, /^https:\/\/connect.stripe.com/);
    const liveWithdrawal = await request("/trading/providers/stripe/withdrawals", { requestId: randomUUID(), amount: 15 });
    assert.equal(liveWithdrawal.success, true, JSON.stringify(liveWithdrawal));
    assert.equal((await state()).users.find(user => user.id === 1).balance, balanceBeforePayout - 15);
    assert.equal((await state()).users.find(user => user.id === 1).heldBalance, 15);
    const liveApprove = action();
    const approvalPath = "/admin/cashier/providers/transactions/" + liveWithdrawal.payment.id + "/accept";
    const accepted = await request(approvalPath, liveApprove);
    assert.equal(accepted.success, true, JSON.stringify(accepted));
    assert.equal((await request(approvalPath, liveApprove)).replayed, true);
    const afterPayout = await state();
    assert.equal(afterPayout.payments.find(row => row.id === liveWithdrawal.payment.id).status, "completed");
    assert.equal(afterPayout.users.find(user => user.id === 1).heldBalance, 0);
    assert.equal(afterPayout.users.find(user => user.id === 1).balance, balanceBeforePayout - 15);
    assert.equal(afterPayout.calls.payouts.filter(row => row.reference === liveWithdrawal.payment.requestId).length, 1);
    for (const value of ["http://insecure.test", "https://user:pass@payments.test", "https://payments.test/path", "https://payments.test?key=secret"]) {
      assert.equal((await setup("stripe", { apiOrigin: value })).error, "INVALID_PAYMENT_ORIGIN");
    }
    assert.equal((await setup("skindeck", { mode: "sandbox" }, {
      apiKey: "fixture-skindeck-admin-key", webhookSecret: "fixture-skindeck-admin-webhook",
    })).success, true);
    assert.ok((await getProvider("skindeck")).credentials.every(field => field.source === "admin"));
    const final = await state();
    for (const record of final.providers) {
      if (record.credentials) assert.equal(JSON.parse(record.credentials).source, "application");
      assert.ok(!JSON.stringify(record).includes(paypalKeys.clientSecret));
      assert.ok(!JSON.stringify(record).includes("sk_live_mock_fixture"));
      assert.ok(!JSON.stringify(record).includes("rk_live_mock_fixture"));
      assert.ok(!JSON.stringify(record).includes("fixture-skindeck-admin-key"));
    }
  },
);
