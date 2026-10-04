const { encrypt, decrypt, encryptionKey } = require("./vault");
const { AsyncLocalStorage } = require("node:async_hooks");
const { sql } = require("../../../database");
const { perform } = require("../../admin/cashier/actions");
const context = new AsyncLocalStorage();
const fail = (code, status = 400) =>
  Object.assign(new Error(code), { code, status });
const definitions = {
  paypal: {
    name: "PayPal",
    deposits: true,
    withdrawals: true,
    integrated: true,
    modes: ["sandbox", "live"],
    callback: "/trading/providers/paypal/webhook",
    fields: {
      email: "PAYPAL_RECEIVING_EMAIL",
      clientId: "PAYPAL_CLIENT_ID",
      clientSecret: "PAYPAL_CLIENT_SECRET",
      webhookId: "PAYPAL_WEBHOOK_ID",
      merchantId: "PAYPAL_MERCHANT_ID",
    },
  },
  stripe: {
    name: "Stripe",
    processor: "stripe",
    deposits: true,
    withdrawals: true,
    integrated: true,
    modes: ["sandbox", "live"],
    callback: "/trading/providers/stripe/webhook",
    fields: {
      secretKey: "STRIPE_SECRET_KEY",
      webhookSecret: "STRIPE_WEBHOOK_SECRET",
    },
  },
  applepay: {
    name: "Apple Pay",
    processor: "stripe",
    deposits: true,
    withdrawals: false,
    integrated: true,
    modes: ["sandbox", "live"],
    callback: "/trading/providers/applepay/webhook",
    fields: {
      secretKey: "STRIPE_SECRET_KEY",
      webhookSecret: "STRIPE_WEBHOOK_SECRET",
    },
    policy:
      "Apple Pay appears on eligible devices; card checkout is available as a fallback. Wallet payouts are not supported by this integration.",
  },
  cashapp: {
    name: "Cash App Pay",
    processor: "stripe",
    deposits: true,
    withdrawals: false,
    integrated: true,
    modes: ["sandbox", "live"],
    callback: "/trading/providers/cashapp/webhook",
    fields: {
      secretKey: "STRIPE_SECRET_KEY",
      webhookSecret: "STRIPE_WEBHOOK_SECRET",
    },
    policy:
      "Cash App Pay checkout in USD. This integration does not send withdrawals to a $cashtag.",
  },
  skindeck: {
    name: "SkinDeck",
    deposits: true,
    withdrawals: true,
    modes: ["sandbox", "live"],
    callback: "/trading/skindeck/webhook",
    fields: {
      apiKey: "SKINDECK_API_KEY",
      webhookSecret: "SKINDECK_WEBHOOK_SECRET",
    },
  },
  giftcards: {
    name: "Gift cards",
    deposits: true,
    withdrawals: false,
    fields: {},
  },
};
// Historical callbacks and reconciliation keep their original credentials.
// These providers cannot be configured or used to create new payments.
const retiredDefinitions = {
  coinpayments: {
    retired: true,
    name: "CoinPayments",
    deposits: true,
    withdrawals: false,
    callback: "/trading/crypto/deposit/ipn",
    fields: {
      apiKey: "COINPAYMENTS_KEY",
      apiSecret: "COINPAYMENTS_SECRET",
      ipnSecret: "COINPAYMENTS_IPN_SECRET",
      merchantId: "COINPAYMENTS_MERCHANT_ID",
    },
  },
  mexc: {
    retired: true,
    name: "MEXC",
    deposits: false,
    withdrawals: true,
    fields: { apiKey: "MEXC_API_KEY", apiSecret: "MEXC_API_SECRET" },
  },
  zebra: {
    retired: true,
    name: "Zebra cards",
    deposits: true,
    withdrawals: false,
    callback: "/trading/deposit/cc/ipn",
    fields: { apiKey: "ZEBRA_API_KEY", partnerId: "ZEBRA_PARTNER_ID" },
  },
};
const legacyFeatures = {
  coinpayments: { deposits: "cryptoDeposits" },
  mexc: { withdrawals: "cryptoWithdrawals" },
  zebra: { deposits: "cardDeposits" },
};
function definition(id) {
  if (Object.hasOwn(definitions, id)) return definitions[id];
  if (Object.hasOwn(retiredDefinitions, id)) return retiredDefinitions[id];
  throw fail("UNKNOWN_PAYMENT_PROVIDER", 404);
}
function isStripe(config) {
  return config.id === "stripe" || config.definition?.processor === "stripe";
}
function stripeKeyMatchesMode(value, mode) {
  const type = mode === "sandbox" ? "test" : "live";
  return ["sk_", "rk_"].some(prefix => value.startsWith(prefix + type + "_"));
}
function requiredCredentials(config, direction = "deposit") {
  if (config.id === "paypal")
    return direction === "deposit" && config.depositFlow === "email"
      ? ["email"] : Object.keys(config.definition.fields).filter(key => key !== "email");
  return Object.keys(config.definition.fields);
}
function defaults(id) {
  const def = definition(id),
    skins = id === "skindeck";
  const features = require("../../admin/config").enabledFeatures;
  const enabled = (direction) => {
    const feature = legacyFeatures[id]?.[direction];
    return (
      def[direction] &&
      (!feature || features[feature] !== false) &&
      (!skins ||
        (process.env.SKINDECK_ENABLED === "true" &&
          features.skindeck !== false))
    );
  };
  return {
    mode: def.integrated
      ? "sandbox"
      : skins
        ? process.env.SKINDECK_MODE || "sandbox"
        : "live",
    depositsEnabled: def.integrated ? false : enabled("deposits"),
    withdrawalsEnabled: def.integrated ? false : enabled("withdrawals"),
    minDeposit: 5,
    maxDeposit: 500,
    minWithdrawal: 5,
    maxWithdrawal: 500,
    depositPercent: 0,
    depositFixed: 0,
    withdrawalPercent: 0,
    withdrawalFixed: 0,
    merchantApproval: "",
    connectCountry: "US",
    apiOrigin: "",
    frontendOrigin: "",
    depositFlow: id === "paypal" ? "email" : "api",
  };
}
function envCredentials(id, mode) {
  const def = definition(id),
    values = {};
  const namespace = def.processor === "stripe" ? "STRIPE" : id.toUpperCase();
  for (const [field, name] of Object.entries(def.fields)) {
    const scoped = def.integrated
      ? process.env[
          name.replace(
            namespace + "_",
            namespace + "_" + (mode === "sandbox" ? "TEST" : "LIVE") + "_",
          )
        ]
      : "";
    const generic = process.env[name] || "";
    values[field] =
      scoped ||
      (id === "paypal" && mode !== (process.env.PAYPAL_MODE || "sandbox")
        ? ""
        : generic);
  }
  if (
    (id === "stripe" || def.processor === "stripe") &&
    values.secretKey &&
    !stripeKeyMatchesMode(values.secretKey, mode)
  )
    values.secretKey = "";
  return values;
}
async function configuration(id, mode, connection = sql) {
  const def = definition(id),
    [[row]] = await connection.query(
      "SELECT * FROM paymentProviders WHERE id=?",
      [id],
    );
  const settings = {
    ...defaults(id),
    ...(row ? JSON.parse(row.settings) : {}),
  };
  // Previously saved PayPal configurations keep their API checkout flow.
  if (id === "paypal" && row && !Object.hasOwn(JSON.parse(row.settings), "depositFlow"))
    settings.depositFlow = "api";
  const actualMode = mode || settings.mode,
    stored = decrypt(id, row?.credentials);
  return {
    id,
    definition: def,
    ...settings,
    mode: actualMode,
    version: row?.version || 0,
    credentials: {
      ...envCredentials(id, actualMode),
      ...(stored[actualMode] || {}),
    },
    stored,
  };
}
function publicOrigin(frontend = false, config = {}) {
  try {
    const value =
      (frontend ? config.frontendOrigin || config.apiOrigin : config.apiOrigin) || (
      frontend && process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL
        : process.env.BASE_URL ||
          (process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
            : process.env.FRONTEND_URL));
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      !["https:", "http:"].includes(url.protocol) ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    )
      throw Error();
    return url.origin;
  } catch {
    throw fail("PAYMENT_PUBLIC_URL_REQUIRED", 503);
  }
}
function availability(config, direction) {
  if (config.definition.retired) return "PAYMENT_PROVIDER_REMOVED";
  const supported =
    config.definition[direction === "deposit" ? "deposits" : "withdrawals"];
  if (!supported) return "PAYMENT_DIRECTION_UNSUPPORTED";
  if (
    !config[direction === "deposit" ? "depositsEnabled" : "withdrawalsEnabled"]
  )
    return "DISABLED";
  const feature =
    legacyFeatures[config.id]?.[
      direction === "deposit" ? "deposits" : "withdrawals"
    ];
  if (feature && !require("../../admin/config").enabledFeatures[feature])
    return "DISABLED";
  if (
    config.id === "skindeck" &&
    !require("../../admin/config").enabledFeatures.skindeck
  )
    return "DISABLED";
  const missing = requiredCredentials(config, direction).filter(
    (field) => !config.credentials[field],
  );
  if (config.id === "skindeck" && config.mode === "sandbox") return null;
  if (config.id === "skindeck" && config.mode === "live")
    return "SKINDECK_CONTRACT_UNAVAILABLE";
  if (missing.length) return "PAYMENT_PROVIDER_UNCONFIGURED";
  if (config.definition.integrated && !(config.id === "paypal" && direction === "deposit" && config.depositFlow === "email")) {
    try {
      publicOrigin(false, config);
      publicOrigin(true, config);
    } catch (e) {
      return e.code;
    }
  }
  return null;
}
async function present(id) {
  const c = await configuration(id),
    def = c.definition;
  let canStoreSecrets = false;
  try {
    encryptionKey();
    canStoreSecrets = true;
  } catch {}
  return {
    id,
    name: def.name,
    version: c.version,
    integrated: !!def.integrated,
    modes: def.modes || ["live"],
    settings: Object.fromEntries(
      Object.keys(defaults(id)).map((key) => [key, c[key]]),
    ),
    deposits: {
      supported: !!def.deposits,
      available: !availability(c, "deposit"),
      reason: availability(c, "deposit"),
    },
    withdrawals: {
      supported: !!def.withdrawals,
      available: !availability(c, "withdrawal"),
      reason: availability(c, "withdrawal"),
    },
    credentials: Object.entries(def.fields).map(([key, env]) => ({
      key,
      env,
      configured: !!c.credentials[key],
      source: c.stored[c.mode]?.[key]
        ? "admin"
        : c.credentials[key]
          ? "environment"
          : "missing",
    })),
    canStoreSecrets,
    callbackPath: def.callback || null,
    policy: def.policy || null,
  };
}
function validateSettings(id, values) {
  const def = definition(id),
    keys = Object.keys(defaults(id));
  if (
    !values ||
    typeof values !== "object" ||
    Array.isArray(values) ||
    Object.keys(values).some((k) => !keys.includes(k))
  )
    throw fail("INVALID_PROVIDER_SETTINGS");
  const settings = { ...defaults(id), ...values };
  if (!(def.modes || ["live"]).includes(settings.mode))
    throw fail("INVALID_PROVIDER_MODE");
  if (!["api", "email"].includes(settings.depositFlow) || (id !== "paypal" && settings.depositFlow !== "api"))
    throw fail("INVALID_PROVIDER_SETTINGS");
  for (const key of ["depositsEnabled", "withdrawalsEnabled"])
    if (typeof settings[key] !== "boolean")
      throw fail("INVALID_PROVIDER_SETTINGS");
  if (
    (settings.depositsEnabled && !def.deposits) ||
    (settings.withdrawalsEnabled && !def.withdrawals)
  )
    throw fail("PAYMENT_DIRECTION_UNSUPPORTED");
  for (const key of [
    "minDeposit",
    "maxDeposit",
    "minWithdrawal",
    "maxWithdrawal",
    "depositFixed",
    "withdrawalFixed",
  ])
    if (
      typeof settings[key] !== "number" ||
      !Number.isFinite(settings[key]) ||
      settings[key] < 0 ||
      settings[key] > 1000000 ||
      Math.abs(settings[key] * 100 - Math.round(settings[key] * 100)) > 1e-6
    )
      throw fail("INVALID_PROVIDER_LIMIT");
  for (const key of ["depositPercent", "withdrawalPercent"])
    if (
      typeof settings[key] !== "number" ||
      !Number.isFinite(settings[key]) ||
      settings[key] < 0 ||
      settings[key] > 25
    )
      throw fail("INVALID_PROVIDER_FEE");
  if (
    settings.minDeposit > settings.maxDeposit ||
    settings.minWithdrawal > settings.maxWithdrawal
  )
    throw fail("INVALID_PROVIDER_LIMIT");
  if (
    typeof settings.merchantApproval !== "string" ||
    settings.merchantApproval.length > 500 ||
    !/^[A-Z]{2}$/.test(settings.connectCountry)
  )
    throw fail("INVALID_PROVIDER_SETTINGS");
  for (const field of ["apiOrigin", "frontendOrigin"]) {
    const value = settings[field];
    if (typeof value !== "string" || value.length > 2048)
      throw fail("INVALID_PAYMENT_ORIGIN");
    if (!value.trim()) { settings[field] = ""; continue; }
    try {
      const url = new URL(value.trim());
      if (url.username || url.password || url.search || url.hash ||
          url.pathname !== "/" || !["https:", "http:"].includes(url.protocol) ||
          (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw Error();
      settings[field] = url.origin;
    } catch { throw fail("INVALID_PAYMENT_ORIGIN"); }
  }
  return settings;
}
async function save(actor, id, body) {
  if (Object.hasOwn(retiredDefinitions, id))
    throw fail("PAYMENT_PROVIDER_REMOVED", 410);
  definition(id);
  const settings = validateSettings(id, body.settings);
  const input = body.credentials || {};
  if (
    Array.isArray(input) ||
    typeof input !== "object" ||
    Object.keys(input).some((k) => !Object.hasOwn(definitions[id].fields, k)) ||
    Object.values(input).some((v) => typeof v !== "string" || v.length > 4096)
  )
    throw fail("INVALID_PROVIDER_CREDENTIALS");
  const clear = body.clearSecrets || [];
  if (id === "paypal" && input.email?.trim() && (input.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())))
    throw fail("INVALID_PAYPAL_EMAIL");
  if (
    !Array.isArray(clear) ||
    clear.some((k) => !Object.hasOwn(definitions[id].fields, k))
  )
    throw fail("INVALID_PROVIDER_CREDENTIALS");
  if (
    (id === "stripe" || definitions[id].processor === "stripe") &&
    input.secretKey &&
    !stripeKeyMatchesMode(input.secretKey.trim(), settings.mode)
  )
    throw fail("STRIPE_KEY_MODE_MISMATCH");
  return perform(
    actor,
    "provider.configure." + id,
    0,
    body,
    async (connection) => {
      await connection.query(
        "INSERT IGNORE INTO paymentProviders (id,settings,version) VALUES (?,?,0)",
        [id, JSON.stringify(defaults(id))],
      );
      await connection.query(
        "SELECT id FROM paymentProviders WHERE id=? FOR UPDATE",
        [id],
      );
      const c = await configuration(id, undefined, connection);
      if (c.version !== body.version)
        return { error: "STALE_PROVIDER_SETTINGS", status: 409 };
      const stored = c.stored;
      if (id === "skindeck" && settings.mode !== c.mode) {
        const [[open]] = await connection.query(
          "SELECT COUNT(*) AS total FROM paymentTransactions WHERE provider='skindeck' AND status NOT IN ('completed','failed','cancelled','expired')",
        );
        if (open.total > 0)
          return {
            error: "CREDENTIAL_ROTATION_HAS_OPEN_PAYMENTS",
            status: 409,
          };
      }
      const updates = Object.fromEntries(
        Object.entries(input)
          .filter(([, v]) => v.trim())
          .map(([k, v]) => [k, k === "email" ? v.trim().toLowerCase() : v.trim()]),
      );
      if (Object.keys(updates).length || clear.length) {
        const currentMode = await configuration(id, settings.mode, connection);
        const nextStored = { ...(stored[settings.mode] || {}), ...updates };
        for (const key of clear) delete nextStored[key];
        const nextCredentials = {
          ...envCredentials(id, settings.mode),
          ...nextStored,
        };
        const changedFields = Object.keys(definitions[id].fields).filter(
          (key) => nextCredentials[key] !== currentMode.credentials[key],
        );
        const changed = changedFields.length > 0;
        // Email deposits save their receiving address on the payment itself.
        // Neither those deposits nor email changes need API credentials to settle.
        const changesApiCredentials = changedFields.some(key => id !== "paypal" || key !== "email");
        if (changesApiCredentials) {
          const [[pending]] = await connection.query(
            "SELECT COUNT(*) AS total FROM providerPayments WHERE provider=? AND mode=? AND status NOT IN ('completed','failed','cancelled','disputed')" +
              (id === "paypal" ? " AND (flow<>'email' OR type<>'deposit')" : ""),
            [id, settings.mode],
          );
          if (pending.total > 0)
            return {
              error: "CREDENTIAL_ROTATION_HAS_OPEN_PAYMENTS",
              status: 409,
            };
        }
        if (changed && !definitions[id].integrated) {
          const queries = {
            coinpayments: "SELECT COUNT(*) AS total FROM cryptoWallets",
            mexc: "SELECT COUNT(*) AS total FROM cryptoWithdraws WHERE status IN ('pending','sending','sent')",
            zebra:
              "SELECT COUNT(*) AS total FROM cardDeposits WHERE completed=0",
            skindeck:
              "SELECT COUNT(*) AS total FROM paymentTransactions WHERE provider='skindeck' AND status NOT IN ('completed','failed','cancelled','expired')",
          };
          if (queries[id]) {
            const [[legacy]] = await connection.query(queries[id]);
            if (legacy.total > 0)
              return {
                error: "CREDENTIAL_ROTATION_HAS_OPEN_PAYMENTS",
                status: 409,
              };
          }
        }
        stored[settings.mode] = nextStored;
      }
      const ciphertext = Object.keys(stored).length
        ? encrypt(id, stored)
        : null;
      await connection.query(
        "UPDATE paymentProviders SET settings=?,credentials=?,version=?,updatedAt=NOW() WHERE id=?",
        [JSON.stringify(settings), ciphertext, c.version + 1, id],
      );
      if (id === "skindeck")
        await connection.query(
          "UPDATE features SET enabled=? WHERE id='skindeck'",
          [settings.depositsEnabled || settings.withdrawalsEnabled],
        );
      for (const [direction, feature] of Object.entries(
        legacyFeatures[id] || {},
      ))
        await connection.query("UPDATE features SET enabled=? WHERE id=?", [
          settings[
            direction === "deposits" ? "depositsEnabled" : "withdrawalsEnabled"
          ],
          feature,
        ]);
      return { success: true, version: c.version + 1 };
    },
  ).then((result) => {
    if (result.success && id === "skindeck")
      require("../../admin/config").enabledFeatures.skindeck =
        settings.depositsEnabled || settings.withdrawalsEnabled;
    if (result.success)
      for (const [direction, feature] of Object.entries(
        legacyFeatures[id] || {},
      ))
        require("../../admin/config").enabledFeatures[feature] =
          settings[
            direction === "deposits" ? "depositsEnabled" : "withdrawalsEnabled"
          ];
    return result;
  });
}
function paymentEnv(name) {
  const config = context.getStore();
  if (config) {
    const key = Object.entries(config.definition.fields).find(
      ([, env]) => env === name,
    )?.[0];
    if (key) return config.credentials[key] || "";
    if (config.id === "skindeck" && name === "SKINDECK_MODE")
      return config.mode;
    if (config.id === "skindeck" && name === "SKINDECK_ENABLED")
      return config.depositsEnabled || config.withdrawalsEnabled
        ? "true"
        : "false";
  }
  return process.env[name];
}
module.exports = {
  isStripe,
  definitions,
  definition,
  configuration,
  present,
  save,
  validateSettings,
  availability,
  publicOrigin,
  requiredCredentials,
  fail,
  context,
  paymentEnv,
  encrypt,
  decrypt,
};
