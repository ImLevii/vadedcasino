const axios = require("axios");
const crypto = require("node:crypto");
const { fail, publicOrigin, isStripe } = require("./config");
function form(value, prefix = "", result = new URLSearchParams()) {
  for (const [key, item] of Object.entries(value)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (item != null && typeof item === "object") form(item, name, result);
    else if (item != null) result.append(name, String(item));
  }
  return result;
}
async function request(config, path, method = "GET", body, key) {
  try {
    const stripe = isStripe(config),
      base = stripe
        ? "https://api.stripe.com"
        : config.mode === "live"
          ? "https://api-m.paypal.com"
          : "https://api-m.sandbox.paypal.com";
    let headers;
    const requestKey = key
      ? crypto
          .createHash("sha256")
          .update(config.id + ":" + path + ":" + key)
          .digest("hex")
          .slice(0, 32)
      : null;
    if (stripe)
      headers = {
        Authorization: "Bearer " + config.credentials.secretKey,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(requestKey ? { "Idempotency-Key": requestKey } : {}),
      };
    else {
      const token = await axios.request({
        url: base + "/v1/oauth2/token",
        method: "POST",
        data: "grant_type=client_credentials",
        auth: {
          username: config.credentials.clientId,
          password: config.credentials.clientSecret,
        },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 8000,
        maxRedirects: 0,
      });
      if (!token.data?.access_token) throw Error();
      headers = {
        Authorization: "Bearer " + token.data.access_token,
        "Content-Type": "application/json",
        ...(requestKey ? { "PayPal-Request-Id": requestKey } : {}),
      };
    }
    const response = await axios.request({
      url: base + path,
      method,
      headers,
      ...(body ? { data: stripe ? form(body).toString() : body } : {}),
      timeout: 8000,
      maxRedirects: 0,
      maxContentLength: 1000000,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) throw fail("PAYMENT_PROVIDER_AUTH_FAILED", 503);
    if (error.response?.status === 403) throw fail("PAYMENT_PROVIDER_ACCESS_DENIED", 503);
    throw fail("PAYMENT_PROVIDER_REQUEST_UNCONFIRMED", 503);
  }
}
function safeCheckout(url, provider) {
  try {
    const value = new URL(url),
      domain = provider === "paypal" ? "paypal.com" : "stripe.com";
    if (
      value.protocol !== "https:" ||
      value.username ||
      value.password ||
      !(value.hostname === domain || value.hostname.endsWith("." + domain))
    )
      throw Error();
    return value.href;
  } catch {
    throw fail("INVALID_PROVIDER_CHECKOUT_URL", 503);
  }
}
async function createDeposit(config, payment) {
  const returnUrl =
    publicOrigin(true, config) + `/deposit?type=${config.id}&payment=${payment.id}`;
  if (isStripe(config)) {
    const data = await request(
      config,
      "/v1/checkout/sessions",
      "POST",
      {
        mode: "payment",
        payment_method_types: [config.id === "cashapp" ? "cashapp" : "card"],
        client_reference_id: payment.requestId,
        metadata: {
          reference: payment.requestId,
          userId: String(payment.userId),
          ...(config.id === "stripe" ? {} : { paymentProvider: config.id }),
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: payment.fiatCents,
              product_data: { name: payment.mode === "sandbox"
                ? "Cosmic Luck coins (test payment)" : "Cosmic Luck coins" },
            },
            quantity: 1,
          },
        ],
        success_url: returnUrl + "&checkout=success",
        cancel_url: returnUrl + "&checkout=cancelled",
      },
      payment.requestId,
    );
    if (!data.id) throw fail("INVALID_PROVIDER_RESPONSE", 503);
    return {
      providerRef: data.id,
      checkoutUrl: safeCheckout(data.url, "stripe"),
    };
  }
  const data = await request(
    config,
    "/v2/checkout/orders",
    "POST",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: payment.requestId,
          custom_id: payment.requestId,
          invoice_id: payment.requestId,
          description: "Cosmic Luck coins",
          amount: {
            currency_code: "USD",
            value: (payment.fiatCents / 100).toFixed(2),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            return_url: returnUrl + "&checkout=approved",
            cancel_url: returnUrl + "&checkout=cancelled",
            user_action: "PAY_NOW",
          },
        },
      },
    },
    payment.requestId,
  );
  const link = data.links?.find((link) =>
    ["payer-action", "approve"].includes(link.rel),
  );
  if (!data.id || !link) throw fail("INVALID_PROVIDER_RESPONSE", 503);
  return {
    providerRef: data.id,
    checkoutUrl: safeCheckout(link.href, "paypal"),
  };
}
async function readDeposit(config, ref, capture = false, reference) {
  if (isStripe(config))
    return request(config, "/v1/checkout/sessions/" + encodeURIComponent(ref));
  if (capture) {
    try {
      await request(
        config,
        `/v2/checkout/orders/${encodeURIComponent(ref)}/capture`,
        "POST",
        {},
        "capture-" + reference,
      );
    } catch {
      /* Read the order: another callback may have captured it already. */
    }
  }
  return request(config, "/v2/checkout/orders/" + encodeURIComponent(ref));
}
async function findDeposit(config, payment) {
  if (!isStripe(config)) throw fail("PAYMENT_REQUIRES_RECONCILIATION", 409);
  let after;
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({ limit: "100" });
    if (after) params.set("starting_after", after);
    const result = await request(config, "/v1/checkout/sessions?" + params);
    const matches = (result.data || []).filter(row => row.metadata?.reference === payment.requestId);
    if (matches.length > 1) throw fail("PAYMENT_REQUIRES_FINANCE_REVIEW", 409);
    if (matches.length) return matches[0];
    if (!result.has_more || !result.data?.length) break;
    after = result.data.at(-1).id;
  }
  throw fail("PAYMENT_REQUIRES_RECONCILIATION", 409);
}
async function createPayout(config, payment) {
  if (!config.definition.withdrawals)
    throw fail("PAYMENT_DIRECTION_UNSUPPORTED");
  if (isStripe(config)) {
    const data = await request(
      config,
      "/v1/transfers",
      "POST",
      {
        amount: payment.fiatCents,
        currency: "usd",
        destination: payment.receiver,
        metadata: { reference: payment.requestId },
      },
      payment.requestId,
    );
    if (!data.id) throw fail("INVALID_PROVIDER_RESPONSE", 503);
    return { providerRef: data.id };
  }
  const data = await request(
    config,
    "/v1/payments/payouts",
    "POST",
    {
      sender_batch_header: {
        sender_batch_id: payment.requestId,
        email_subject: "Your Cosmic Luck withdrawal",
      },
      items: [
        {
          recipient_type: "EMAIL",
          receiver: payment.receiver,
          amount: {
            value: (payment.fiatCents / 100).toFixed(2),
            currency: "USD",
          },
          sender_item_id: payment.requestId,
        },
      ],
    },
    payment.requestId,
  );
  if (!data.batch_header?.payout_batch_id)
    throw fail("INVALID_PROVIDER_RESPONSE", 503);
  return { providerRef: data.batch_header.payout_batch_id };
}
async function readPayout(config, payment, ref = payment.providerRef) {
  if (config.id === "paypal") {
    if (!ref) return null;
    return request(
      config,
      `/v1/payments/payouts/${encodeURIComponent(ref)}?page_size=1000`,
    );
  }
  if (ref) return request(config, "/v1/transfers/" + encodeURIComponent(ref));
  // A missing result is uncertain, never proof that money was not sent.
  let after;
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      limit: "100",
      destination: payment.receiver,
      "created[gte]": String(
        Math.floor(new Date(payment.createdAt).getTime() / 1000) - 60,
      ),
      ...(after ? { starting_after: after } : {}),
    });
    const data = await request(config, "/v1/transfers?" + params);
    const match = data.data?.find(
      (row) => row.metadata?.reference === payment.requestId,
    );
    if (match) return match;
    if (!data.has_more || !data.data?.length) break;
    after = data.data.at(-1).id;
  }
  return null;
}
function cents(value) {
  if (typeof value !== "string" || !/^\d{1,9}(\.\d{1,2})?$/.test(value))
    throw fail("PAYMENT_AMOUNT_MISMATCH", 409);
  return Math.round(Number(value) * 100);
}
function confirmDeposit(config, payment, remote) {
  if (isStripe(config)) {
    if (
      remote.id !== (payment.providerRef || remote.id) ||
      remote.metadata?.reference !== payment.requestId ||
      String(remote.metadata?.userId) !== String(payment.userId) ||
      (remote.metadata?.paymentProvider &&
        remote.metadata.paymentProvider !== config.id) ||
      (config.id !== "stripe" &&
        remote.metadata?.paymentProvider !== config.id) ||
      (config.id === "cashapp" &&
        (remote.payment_method_types?.length !== 1 ||
          remote.payment_method_types[0] !== "cashapp")) ||
      remote.currency !== "usd" ||
      remote.amount_total !== Number(payment.fiatCents) ||
      remote.livemode !== (payment.mode === "live")
    )
      throw fail("PAYMENT_IDENTITY_MISMATCH", 409);
    if (remote.payment_status !== "paid")
      return {
        status: remote.status === "expired" ? "failed" : "awaiting_payment",
        providerRef: remote.id,
        checkoutUrl: remote.url ? safeCheckout(remote.url, "stripe") : null,
      };
    return {
      status: "completed",
      providerRef: remote.id,
      settlementRef: remote.payment_intent,
    };
  }
  const unit = remote.purchase_units?.[0];
  if (
    remote.purchase_units?.length !== 1 ||
    !unit ||
    remote.id !== (payment.providerRef || remote.id) ||
    unit.custom_id !== payment.requestId ||
    unit.payee?.merchant_id !== config.credentials.merchantId ||
    unit.amount?.currency_code !== "USD" ||
    cents(unit.amount.value) !== Number(payment.fiatCents)
  )
    throw fail("PAYMENT_IDENTITY_MISMATCH", 409);
  const captures = unit.payments?.captures || [];
  if (remote.status !== "COMPLETED" || !captures.length)
    return { status: "awaiting_payment" };
  if (captures.length !== 1 || captures[0].status !== "COMPLETED")
    return { status: "awaiting_payment" };
  if (
    captures[0].amount?.currency_code !== "USD" ||
    cents(captures[0].amount.value) !== Number(payment.fiatCents) ||
    !captures[0].id
  )
    throw fail("PAYMENT_AMOUNT_MISMATCH", 409);
  return {
    status: "completed",
    providerRef: remote.id,
    settlementRef: captures[0].id,
  };
}
function confirmPayout(config, payment, remote) {
  if (!remote) throw fail("PAYOUT_NOT_CONFIRMED_KEEP_RESERVED", 409);
  if (isStripe(config)) {
    if (
      remote.metadata?.reference !== payment.requestId ||
      remote.destination !== payment.receiver ||
      remote.amount !== Number(payment.fiatCents) ||
      remote.currency !== "usd" ||
      remote.livemode !== (payment.mode === "live") ||
      remote.reversed ||
      Number(remote.amount_reversed || 0) !== 0
    )
      throw fail("PAYMENT_IDENTITY_MISMATCH", 409);
    return {
      status: "completed",
      providerRef: remote.id,
      settlementRef: remote.id,
    };
  }
  const row = remote.items?.find(
    (item) => item.payout_item?.sender_item_id === payment.requestId,
  );
  if (
    remote.batch_header?.sender_batch_header?.sender_batch_id !==
      payment.requestId ||
    !row ||
    row.payout_item.receiver.toLowerCase() !== payment.receiver ||
    row.payout_item.amount?.currency !== "USD" ||
    cents(row.payout_item.amount.value) !== Number(payment.fiatCents)
  )
    throw fail("PAYMENT_IDENTITY_MISMATCH", 409);
  return {
    status:
      row.transaction_status === "SUCCESS"
        ? "completed"
        : ["FAILED", "BLOCKED", "DENIED", "CANCELED", "RETURNED"].includes(
              row.transaction_status,
            )
          ? "failed"
          : "sending",
    providerRef: remote.batch_header.payout_batch_id,
    settlementRef: row.payout_item_id,
  };
}
async function verifyWebhook(config, req) {
  if (isStripe(config)) {
    const raw = req.rawJsonBody,
      header = req.get("stripe-signature") || "";
    const timestamp = header
        .split(",")
        .find((x) => x.startsWith("t="))
        ?.slice(2),
      signatures = header
        .split(",")
        .filter((x) => x.startsWith("v1="))
        .map((x) => x.slice(3));
    if (
      !Buffer.isBuffer(raw) ||
      !/^\d+$/.test(timestamp || "") ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
      !config.credentials.webhookSecret
    )
      throw fail("INVALID_SIGNATURE", 403);
    const expected = crypto
      .createHmac("sha256", config.credentials.webhookSecret)
      .update(timestamp + ".")
      .update(raw)
      .digest();
    if (
      !signatures.some(
        (value) =>
          /^[a-f0-9]{64}$/i.test(value) &&
          crypto.timingSafeEqual(expected, Buffer.from(value, "hex")),
      )
    )
      throw fail("INVALID_SIGNATURE", 403);
    if (req.body.livemode !== (config.mode === "live"))
      throw fail("INVALID_PROVIDER_MODE", 403);
  } else {
    const data = await request(
      config,
      "/v1/notifications/verify-webhook-signature",
      "POST",
      {
        auth_algo: req.get("paypal-auth-algo"),
        cert_url: req.get("paypal-cert-url"),
        transmission_id: req.get("paypal-transmission-id"),
        transmission_sig: req.get("paypal-transmission-sig"),
        transmission_time: req.get("paypal-transmission-time"),
        webhook_id: config.credentials.webhookId,
        webhook_event: req.body,
      },
    );
    if (data.verification_status !== "SUCCESS")
      throw fail("INVALID_SIGNATURE", 403);
  }
}
async function probe(config) {
  if (config.id === "paypal" && config.depositFlow === "email" && !config.withdrawalsEnabled)
    return { success: true, localOnly: true, manualApproval: true };
  if (isStripe(config)) {
    const account = await request(config, "/v1/account");
    return { success: true, accountId: account.id };
  }
  if (config.id === "paypal") {
    const webhook = await request(
      config,
      "/v1/notifications/webhooks/" +
        encodeURIComponent(config.credentials.webhookId),
    );
    if (webhook.id !== config.credentials.webhookId)
      throw fail("PAYMENT_WEBHOOK_NOT_CONFIGURED", 409);
    return { success: true, webhookConfigured: true };
  }
  return { success: true, localOnly: true };
}
module.exports = {
  request,
  createDeposit,
  readDeposit,
  findDeposit,
  createPayout,
  readPayout,
  confirmDeposit,
  confirmPayout,
  verifyWebhook,
  probe,
  safeCheckout,
  cents,
};
