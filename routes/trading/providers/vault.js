const crypto = require("node:crypto");
const fail = (code) => Object.assign(new Error(code), { code, status: 503 });

function key(source) {
  if (source === "environment") {
    const value = process.env.PAYMENT_SETTINGS_KEY || "";
    const result = /^[a-f0-9]{64}$/i.test(value)
      ? Buffer.from(value, "hex")
      : Buffer.from(value, "base64");
    if (result.length !== 32) throw fail("PAYMENT_SETTINGS_KEY_INVALID");
    return result;
  }
  if (source !== "application") throw fail("PAYMENT_CREDENTIALS_UNREADABLE");
  const secret = process.env.JWT_SECRET || "";
  if (Buffer.byteLength(secret) < 32) throw fail("PAYMENT_SERVER_SECRET_UNAVAILABLE");
  // Domain separation keeps the credential key distinct from the signing key.
  return Buffer.from(crypto.hkdfSync(
    "sha256", secret, "cosmicluck-payment-vault", "credentials-v1", 32,
  ));
}
function encryptionKey() {
  return key(process.env.PAYMENT_SETTINGS_KEY ? "environment" : "application");
}
function encrypt(id, value) {
  const source = process.env.PAYMENT_SETTINGS_KEY ? "environment" : "application";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(source), iv);
  cipher.setAAD(Buffer.from(`1:${source}:${id}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return JSON.stringify({
    version: 1, source, iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64"),
  });
}
function decrypt(id, value) {
  if (!value) return {};
  try {
    const record = JSON.parse(value);
    const legacy = record.version === undefined && record.source === undefined;
    if (!legacy && record.version !== 1) throw Error();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm", key(legacy ? "environment" : record.source),
      Buffer.from(record.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(legacy ? id : `1:${record.source}:${id}`));
    decipher.setAuthTag(Buffer.from(record.tag, "base64"));
    return JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(record.data, "base64")), decipher.final(),
    ]).toString());
  } catch {
    throw fail("PAYMENT_CREDENTIALS_UNREADABLE");
  }
}
module.exports = { encrypt, decrypt, encryptionKey };
