const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const { randomUUID, createHmac } = require("node:crypto");
const jwt = require("jsonwebtoken");

test(
  "PayPal email deposits: receipt approval, audit, idempotency and sandbox isolation",
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

    assert.equal((await request("/admin/cashier/providers")).error, "2FA_REQUIRED");
    assert.equal((await request("/admin/2fa", {})).success, true);
    const initial = await getProvider("paypal");
    assert.equal(initial.settings.depositFlow, "email");
    const save = (settings, credentials) => setup("paypal", {apiOrigin:"",frontendOrigin:"",...settings},credentials);
    assert.equal((await save({}, {email:"not-an-email"})).error, "INVALID_PAYPAL_EMAIL");
    assert.equal((await save({}, {email:"a".repeat(255)+"@example.com"})).error, "INVALID_PAYPAL_EMAIL");
    assert.equal((await save({mode:"live",depositsEnabled:true}, {email:" Merchant@Example.COM "})).success,true);
    const configured = await getProvider("paypal");
    assert.equal(configured.deposits.available,true);
    assert.equal(configured.withdrawals.available,false);
    assert.equal(configured.credentials.find(field=>field.key==="email").source,"admin");
    assert.ok(configured.credentials.filter(field=>field.key!=="email").every(field=>!field.configured));
    assert.deepEqual(await request("/admin/cashier/providers/paypal/check",{}),{success:true,localOnly:true,manualApproval:true,httpStatus:200});
    const publicCatalog = await request("/trading/providers");
    assert.equal(publicCatalog.providers.find(p=>p.id==="paypal").depositFlow,"email");
    const create = async (actor=20,amount=15) => {
      const result=await request("/trading/providers/paypal/deposits",{requestId:randomUUID(),amount},actor);
      assert.equal(result.success,true,JSON.stringify(result)+" "+output);
      return result.payment;
    };
    const balance = async actor => (await state()).users.find(user=>user.id===actor).balance;
    const approve = (id,body,actor=1) => request("/admin/cashier/providers/transactions/"+id+"/approve-email",body,actor);
    const reject = (id,body) => request("/admin/cashier/providers/transactions/"+id+"/reject-email",body);
    const receipt = (transactionRef) => action({transactionRef,confirmedReceived:true});
    const pending=await create();
    assert.equal(pending.flow,"email");
    assert.equal(pending.status,"awaiting_payment");
    assert.equal(pending.receiver,"merchant@example.com");
    assert.equal(pending.fiatCents,1050);
    assert.equal(pending.checkoutUrl,undefined);
    assert.equal(await balance(20),100);
    const duplicate=await request("/trading/providers/paypal/deposits",{requestId:pending.requestId,amount:15},20);
    assert.equal(duplicate.payment.id,pending.id);
    assert.equal((await request("/trading/providers/payments/"+pending.id,undefined,21)).httpStatus,404);
    assert.equal((await request("/trading/providers/paypal/payments/"+pending.id+"/capture",{},20)).error,"PAYMENT_MANUAL_REVIEW_REQUIRED");
    assert.equal((await request("/trading/providers/payments/"+pending.id+"/reconcile",{},20)).error,"PAYMENT_MANUAL_REVIEW_REQUIRED");
    assert.equal((await approve(pending.id,receipt("8AB12345678901234"),20)).error,"UNAUTHORIZED");
    assert.equal((await approve(pending.id,action())).error,"PAYPAL_RECEIPT_CONFIRMATION_REQUIRED");
    assert.equal((await approve(pending.id,action({transactionRef:"8AB12345678901234",confirmedReceived:false}))).error,"PAYPAL_RECEIPT_CONFIRMATION_REQUIRED");
    assert.equal((await save({}, {email:"other@example.com"})).success,true);
    assert.equal((await request("/trading/providers/payments/"+pending.id,undefined,20)).payment.receiver,"merchant@example.com");
    const retried = await request("/trading/providers/paypal/deposits",{requestId:pending.requestId,amount:15},20);
    assert.equal(retried.payment.id,pending.id);
    assert.equal(retried.payment.receiver,"merchant@example.com");
    const nextEmail = await create();
    assert.equal(nextEmail.receiver,"other@example.com");
    assert.equal((await reject(nextEmail.id,action())).success,true);
    const body=receipt("8ab12345678901234");
    assert.equal((await approve(pending.id,body)).success,true);
    assert.equal((await approve(pending.id,body)).replayed,true);
    assert.equal((await approve(pending.id,receipt("8AB12345678901234"))).error,"PAYMENT_STATE_CONFLICT");
    assert.equal(await balance(20),115);
    let snapshot=await state();
    assert.equal(snapshot.payments.find(p=>p.id===pending.id).settlementRef,"8AB12345678901234");
    assert.equal(snapshot.payments.find(p=>p.id===pending.id).settled,1);
    assert.equal(snapshot.ledger.filter(row=>row.methodId===pending.id).length,1);
    assert.equal(snapshot.calls.orders.length,0);
    assert.equal(snapshot.calls.captures.length,0);
    assert.equal(snapshot.calls.payouts.length,0);
    const audit=(await request("/admin/cashier/providers/audit")).data;
    assert.equal(audit.filter(row=>row.targetId===pending.id && row.action==="provider.approve-email").length,1);
    const reused=await create(21);
    assert.equal((await approve(reused.id,receipt("8AB12345678901234"))).error,"PAYPAL_TRANSACTION_ALREADY_USED");
    assert.equal(await balance(21),100);
    const rejection=action();
    assert.equal((await reject(reused.id,rejection)).success,true);
    assert.equal((await reject(reused.id,rejection)).replayed,true);
    assert.equal((await approve(reused.id,receipt("9AB12345678901234"))).error,"PAYMENT_STATE_CONFLICT");
    assert.equal(await balance(21),100);
    assert.equal((await state()).ledger.filter(row=>row.methodId===reused.id).length,0);
    // Credit failure must roll back the receipt claim, ledger, rewards and audit.
    const rollback=await create(21);
    assert.equal((await approve(rollback.id,receipt("9AB12345678901235"))).success,undefined);
    snapshot=await state();
    assert.equal(snapshot.payments.find(p=>p.id===rollback.id).status,"awaiting_payment");
    assert.equal(snapshot.payments.find(p=>p.id===rollback.id).settlementRef,null);
    assert.equal(snapshot.ledger.filter(row=>row.methodId===rollback.id).length,0);
    assert.equal((await request("/admin/cashier/providers/audit")).data.filter(row=>row.targetId===rollback.id).length,0);
    assert.equal((await reject(rollback.id,action())).success,true);
    const racing=await create();
    const results=await Promise.all([approve(racing.id,receipt("9AB12345678901236")),approve(racing.id,receipt("9AB12345678901236"))]);
    assert.equal(results.filter(r=>r.success).length,1);
    assert.equal(results.filter(r=>r.error==="PAYMENT_STATE_CONFLICT").length,1);
    assert.equal(await balance(20),130);
    assert.equal((await state()).ledger.filter(row=>row.methodId===racing.id).length,1);
    assert.equal((await save({mode:"sandbox"},{email:"sandbox@example.com"})).success,true);
    assert.equal((await request("/trading/providers/paypal/deposits",{requestId:randomUUID(),amount:15},20)).error,"PAYMENT_TEST_MODE_STAFF_ONLY");
    const staffBalance=await balance(1);
    const sandbox=await create(1);
    assert.equal(sandbox.mode,"sandbox");
    assert.equal(sandbox.receiver,"sandbox@example.com");
    assert.equal((await approve(sandbox.id,receipt("9AB12345678901237"))).success,true);
    assert.equal(await balance(1),staffBalance);
    assert.equal((await state()).ledger.filter(row=>row.methodId===sandbox.id).length,0);
    assert.equal((await state()).calls.orders.length,0);
    // Email changes are independent of API checkouts, which still need their original keys.
    assert.equal((await setup("paypal", {mode:"live",depositFlow:"api",depositsEnabled:true}, {
      clientId:"fixture-client",clientSecret:"fixture-secret",merchantId:"fixture-merchant",webhookId:"fixture-webhook",
    })).success,true);
    const apiPayment = await create();
    assert.equal(apiPayment.flow,"api");
    assert.ok(apiPayment.checkoutUrl);
    assert.equal((await setup("paypal", {depositFlow:"email"}, {email:"latest@example.com"})).success,true);
    assert.equal((await setup("paypal", {}, {clientSecret:"rotated-before-settlement"})).error,"CREDENTIAL_ROTATION_HAS_OPEN_PAYMENTS");
    assert.equal((await request("/trading/providers/paypal/payments/"+apiPayment.id+"/capture",{},20)).success,true);
    const afterApiCredit = await balance(20);
    const manualPending = await create();
    assert.equal(manualPending.flow,"email");
    assert.equal(manualPending.receiver,"latest@example.com");
    // Manual requests do not depend on API secrets, so they do not prevent API setup.
    assert.equal((await setup("paypal", {withdrawalsEnabled:true}, {clientSecret:"rotated-after-api-settlement"})).success,true);
    const payout = await request("/trading/providers/paypal/withdrawals",{requestId:randomUUID(),amount:15,receiver:"player@example.com"},20);
    assert.equal(payout.success,true,JSON.stringify(payout));
    assert.equal((await setup("paypal", {}, {clientSecret:"rotated-before-payout-review"})).error,"CREDENTIAL_ROTATION_HAS_OPEN_PAYMENTS");
    assert.equal((await setup("paypal", {}, {email:"future@example.com"})).success,true);
    assert.equal((await request("/admin/cashier/providers/transactions/"+payout.payment.id+"/deny",action())).success,true);
    assert.equal((await request("/trading/providers/payments/"+manualPending.id,undefined,20)).payment.receiver,"latest@example.com");
    assert.equal((await approve(manualPending.id,receipt("9AB12345678901238"))).success,true);
    assert.equal(await balance(20),afterApiCredit+15);
  },
);
