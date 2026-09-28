const axios = require("axios");
const crypto = require("node:crypto");
const failure = (code) => Object.assign(new Error(code), { code });
function configuration() {
  const missing = [
    "COINPAYMENTS_KEY",
    "COINPAYMENTS_SECRET",
    "COINPAYMENTS_IPN_SECRET",
    "COINPAYMENTS_MERCHANT_ID",
  ].filter((key) => !process.env[key]);
  let origin;
  try {
    origin = new URL(
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
        : process.env.BASE_URL || process.env.FRONTEND_URL,
    );
    if (
      origin.username ||
      origin.password ||
      (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
    )
      origin = null;
  } catch {
    origin = null;
  }
  if (!origin) missing.push("BASE_URL");
  return {
    configured: missing.length === 0,
    missing,
    callbackUrl: origin ? origin.origin + "/trading/crypto/deposit/ipn" : null,
  };
}
async function command(cmd, args = {}) {
  if (!process.env.COINPAYMENTS_KEY || !process.env.COINPAYMENTS_SECRET)
    throw failure("CRYPTO_PROVIDER_UNAVAILABLE");
  const body = new URLSearchParams({
    version: "1",
    cmd,
    key: process.env.COINPAYMENTS_KEY,
    format: "json",
    ...args,
  }).toString();
  const hmac = crypto
    .createHmac("sha512", process.env.COINPAYMENTS_SECRET)
    .update(body)
    .digest("hex");
  try {
    const { data } = await axios.post(
      "https://www.coinpayments.net/api.php",
      body,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          HMAC: hmac,
        },
        timeout: 6000,
        maxRedirects: 0,
      },
    );
    if (data?.error !== "ok" || !data.result)
      throw failure("CRYPTO_PROVIDER_UNAVAILABLE");
    return data.result;
  } catch {
    throw failure("CRYPTO_PROVIDER_UNAVAILABLE");
  }
}
function verify(raw, signature, event) {
  if (
    !process.env.COINPAYMENTS_IPN_SECRET ||
    !process.env.COINPAYMENTS_MERCHANT_ID
  )
    throw failure("CRYPTO_PROVIDER_UNAVAILABLE");
  if (!Buffer.isBuffer(raw) || !/^[a-f0-9]{128}$/i.test(signature || ""))
    throw failure("INVALID_SIGNATURE");
  const expected = crypto
    .createHmac("sha512", process.env.COINPAYMENTS_IPN_SECRET)
    .update(raw)
    .digest();
  if (
    !crypto.timingSafeEqual(expected, Buffer.from(signature, "hex")) ||
    event?.ipn_mode !== "hmac" ||
    event?.merchant !== process.env.COINPAYMENTS_MERCHANT_ID
  )
    throw failure("INVALID_SIGNATURE");
}
module.exports = { configuration, command, verify, failure };
