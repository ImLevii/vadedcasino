const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const { randomUUID, createHmac } = require("node:crypto");
const jwt = require("jsonwebtoken");
test(
  "cashier: authenticated gift cards, atomic deposit settlement and durable payout reconciliation",
  { timeout: 60000 },
  async (t) => {
    const reservation = net.createServer().listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise((r) => reservation.close(r));
    const secret = "cashier-test-secret-longer-than-thirty-two-characters";
    const child = spawn(process.execPath, ["tests/fixtures/postgres-app.cjs"], {
      env: {
        ...process.env,
        VERCEL: "1",
        CASHIER_TEST: "1",
        NODE_ENV: "production",
        PORT: String(port),
        SQL_DIALECT: "postgres",
        DATABASE_URL: "postgres://test:test@localhost/test",
        JWT_SECRET: secret,
        COINPAYMENTS_KEY: "fixture",
        COINPAYMENTS_SECRET: "fixture",
        COINPAYMENTS_IPN_SECRET: "fixture-ipn",
        COINPAYMENTS_MERCHANT_ID: "fixture-merchant",
        MEXC_API_KEY: "fixture",
        MEXC_API_SECRET: "fixture",
        DISCORD_BOT_TOKEN: "",
        BASE_URL: "https://cashier.test",
        ZEBRA_API_KEY: "",
        ZEBRA_PARTNER_ID: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (c) => {
        output += c;
        if (process.env.DEBUG_TEST) process.stdout.write(c);
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
    const tokens = new Map();
    async function request(
      path,
      body,
      method = body ? "POST" : "GET",
      actor = 1,
    ) {
      if (!tokens.has(actor))
        tokens.set(actor, jwt.sign({ uid: String(actor) }, secret));
      const r = await fetch(origin + path, {
        method,
        headers: {
          authorization: tokens.get(actor),
          "content-type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { ...(await r.json()), httpStatus: r.status };
    }
    const action = (extra) => ({
      requestId: randomUUID(),
      reason: "Cashier regression verification",
      ...extra,
    });
    const state = () => request("/__test/cashier");
    assert.equal(
      (await request("/admin/cashier/giftcards")).error,
      "2FA_REQUIRED",
      output,
    );
    assert.equal((await request("/admin/2fa", {})).success, true, output);
    assert.equal(
      (
        await request(
          "/admin/cashier/createGiftCards",
          action({ quantity: "1garbage", amount: 25 }),
        )
      ).error,
      "INVALID_QUANTITY",
    );
    const body = action({ quantity: 2, amount: 25 });
    const [first, retry] = await Promise.all([
      request("/admin/cashier/createGiftCards", body),
      request("/admin/cashier/createGiftCards", body),
    ]);
    assert.equal(first.success, true, JSON.stringify(first) + " " + output);
    assert.deepEqual(first.codes, retry.codes);
    assert.equal((await request("/admin/cashier/giftcards")).total, 2);
    assert.equal((await state()).calls.giftcardBroadcasts, 0);
    assert.equal(
      (await request("/admin/cashier/createGiftCards", { ...body, amount: 30 }))
        .error,
      "IDEMPOTENCY_CONFLICT",
    );
    const cards = await request(
      "/admin/cashier/giftcards?search=" + encodeURIComponent(first.codes[0]),
    );
    assert.equal(cards.total, 1);
    const redeem = await request(
      "/trading/deposit/giftcards/redeem",
      { code: first.codes[0] },
      "POST",
      20,
    );
    assert.equal(redeem.success, true, JSON.stringify(redeem) + " " + output);
    assert.equal(
      (
        await request(
          "/admin/cashier/giftcards/" + cards.data[0].id,
          action(),
          "DELETE",
        )
      ).error,
      "GIFT_CARD_ALREADY_REDEEMED",
    );
    assert.equal(
      (
        await request(
          "/admin/cashier/giftcards/" + cards.data[0].id,
          action({ amount: 30, notes: "test" }),
          "PUT",
        )
      ).error,
      "GIFT_CARD_ALREADY_REDEEMED",
    );
    const event = {
      ipn_type: "deposit",
      ipn_mode: "hmac",
      merchant: "fixture-merchant",
      deposit_id: "deposit-1",
      txn_id: "shared-blockchain-transaction",
      currency: "LTC",
      amount: "1.005",
      fiat_coin: "USD",
      fiat_amount: "1.005",
      status: "100",
      address: "fixture-wallet",
    };
    async function ipn(values, signature) {
      const raw = new URLSearchParams({ ...event, ...values }).toString();
      const r = await fetch(origin + "/trading/crypto/deposit/ipn", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          HMAC:
            signature ||
            createHmac("sha512", "fixture-ipn").update(raw).digest("hex"),
        },
        body: raw,
      });
      return { status: r.status, data: await r.json() };
    }
    const before = await state();
    assert.equal((await ipn({}, "0".repeat(128))).status, 403);
    assert.equal((await ipn({ merchant: "wrong" })).status, 403);
    const replies = await Promise.all([ipn(), ipn(), ipn()]);
    assert.ok(
      replies.every((r) => r.status === 200),
      JSON.stringify(replies) + " " + output,
    );
    let after = await state();
    assert.equal(after.deposits.length, 1);
    assert.equal(after.deposits[0].coinAmount, 1.43);
    assert.equal(
      Math.round((after.users[0].balance - before.users[0].balance) * 100),
      143,
    );
    await ipn({ status: "0" });
    after = await state();
    assert.equal(after.deposits[0].status, "completed");
    assert.equal(
      (await ipn({ deposit_id: "failed-credit", address: "rollback-wallet" }))
        .status,
      503,
    );
    after = await state();
    assert.equal(after.deposits.length, 1);
    assert.equal(after.users[1].balance, 100);
    assert.equal((await request("/trading/deposit/cc")).available, false);
    assert.equal(
      (
        await request(
          "/trading/crypto/withdraw",
          { currency: "LTC", chain: "LTC", amount: -1, address: "test" },
          "POST",
          20,
        )
      ).error,
      "INVALID_AMOUNT",
    );
    const depositList = await request("/admin/cashier/crypto?kind=deposits");
    assert.equal(
      depositList.total,
      1,
      JSON.stringify(depositList) + " " + output,
    );
    const approval = action();
    const approved = await request(
      "/admin/cashier/crypto/accept/901",
      approval,
    );
    assert.equal(
      approved.success,
      true,
      JSON.stringify(approved) + " " + output,
    );
    await request("/admin/cashier/crypto/accept/901", approval);
    after = await state();
    assert.deepEqual(after.calls.payouts, [901]);
    const uncertain = await request(
      "/admin/cashier/crypto/accept/902",
      action(),
    );
    assert.equal(uncertain.error, "PAYOUT_REQUIRES_RECONCILIATION");
    after = await state();
    assert.equal(after.withdrawals.find((t) => t.id === 902).status, "sending");
    assert.equal(
      (await request("/admin/cashier/crypto/deny/902", action())).error,
      "TRANSACTION_NOT_PENDING",
    );
    await request("/admin/cashier/crypto/accept/902", action());
    after = await state();
    assert.deepEqual(after.calls.payouts, [901, 902]);
    assert.equal(
      (await request("/admin/cashier/crypto/reconcile/902", action())).success,
      true,
      output,
    );
    after = await state();
    assert.equal(
      after.withdrawals.find((t) => t.id === 902).status,
      "completed",
    );
    const deny = action();
    const old = after.users[0];
    const denied = await request("/admin/cashier/crypto/deny/903", deny);
    assert.equal(denied.success, true, JSON.stringify(denied) + " " + output);
    await request("/admin/cashier/crypto/deny/903", deny);
    after = await state();
    assert.equal(after.users[0].balance, old.balance + 8);
    assert.equal(after.users[0].cryptoAllowance, old.cryptoAllowance + 8);
    assert.equal(
      after.ledger.filter(
        (t) => t.method === "crypto-cancel" && t.methodId === 903,
      ).length,
      1,
    );
  },
);
