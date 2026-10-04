const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const vault = require("../routes/trading/providers/vault");
const payload = { sandbox: { secretKey: "test-credential-never-plaintext" } };
const applicationSecret = "fixture-application-secret-at-least-thirty-two-bytes";
function environment(t, master = "") {
  const previous = { JWT_SECRET: process.env.JWT_SECRET, PAYMENT_SETTINGS_KEY: process.env.PAYMENT_SETTINGS_KEY };
  process.env.JWT_SECRET = applicationSecret;
  process.env.PAYMENT_SETTINGS_KEY = master;
  t.after(() => {
    for (const [name, value] of Object.entries(previous))
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
  });
}
test("payment vault persists encrypted credentials across processes without a separate environment key", (t) => {
  environment(t);
  const ciphertext = vault.encrypt("stripe", payload);
  assert.equal(JSON.parse(ciphertext).source, "application");
  assert.ok(!ciphertext.includes(payload.sandbox.secretKey));
  assert.notEqual(ciphertext, vault.encrypt("stripe", payload));
  const decoded = execFileSync(process.execPath, ["-e",
    "process.stdout.write(JSON.stringify(require('./routes/trading/providers/vault').decrypt('stripe',process.argv[1])))",
    ciphertext], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(decoded), payload);
});
test("payment vault preserves application records when an optional independent key is added", (t) => {
  environment(t);
  const ciphertext = vault.encrypt("applepay", payload);
  process.env.PAYMENT_SETTINGS_KEY = "11".repeat(32);
  assert.deepEqual(vault.decrypt("applepay", ciphertext), payload);
  const migrated = vault.encrypt("applepay", vault.decrypt("applepay", ciphertext));
  assert.equal(JSON.parse(migrated).source, "environment");
  process.env.JWT_SECRET = "different-application-secret-at-least-thirty-two-bytes";
  assert.deepEqual(vault.decrypt("applepay", migrated), payload);
});
test("payment vault reads legacy provider-bound AES records with the original master key", (t) => {
  environment(t, "22".repeat(32));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(process.env.PAYMENT_SETTINGS_KEY, "hex"), iv);
  cipher.setAAD(Buffer.from("paypal"));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]);
  const ciphertext = JSON.stringify({ iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") });
  assert.deepEqual(vault.decrypt("paypal", ciphertext), payload);
  process.env.PAYMENT_SETTINGS_KEY = "";
  assert.throws(() => vault.decrypt("paypal", ciphertext), { code: "PAYMENT_CREDENTIALS_UNREADABLE" });
});
test("payment vault rejects swapped providers, tampered headers and modified ciphertext", (t) => {
  environment(t);
  const ciphertext = vault.encrypt("stripe", payload);
  assert.throws(() => vault.decrypt("cashapp", ciphertext), { code: "PAYMENT_CREDENTIALS_UNREADABLE" });
  for (const update of [{ source: "environment" }, { version: 2 }, { data: Buffer.alloc(32).toString("base64") }])
    assert.throws(() => vault.decrypt("stripe", JSON.stringify({ ...JSON.parse(ciphertext), ...update })), { code: "PAYMENT_CREDENTIALS_UNREADABLE" });
});
test("payment vault fails closed for invalid server secrets or a malformed explicit master key", (t) => {
  environment(t, "bad-key");
  assert.throws(() => vault.encrypt("stripe", payload), { code: "PAYMENT_SETTINGS_KEY_INVALID" });
  process.env.PAYMENT_SETTINGS_KEY = "";
  process.env.JWT_SECRET = "short";
  assert.throws(() => vault.encrypt("stripe", payload), { code: "PAYMENT_SERVER_SECRET_UNAVAILABLE" });
});
