const fs = require("node:fs");
const path = require("node:path");
async function ensureCashierSchema(connection) {
  for (const statement of ['cashier.sql','providers.sql'].map(file => fs
    .readFileSync(path.join(__dirname, "../database/" + file), "utf8")).join('\n')
    .split(";")
    .filter((s) => s.trim()))
    await connection.query(statement);
  // CREATE IF NOT EXISTS does not upgrade the early provider-payment table.
  const [paymentColumns] = await connection.query("DESCRIBE providerPayments");
  const columnNames = new Set(paymentColumns.map(column => column.Field));
  for (const [name, definition] of [
    ["flow", "VARCHAR(16) NOT NULL DEFAULT 'api'"],
    ["settlementRef", "VARCHAR(128) DEFAULT NULL"],
    ["settled", "INT NOT NULL DEFAULT 0"],
  ]) {
    if (columnNames.has(name)) continue;
    await connection.query(`ALTER TABLE providerPayments ADD COLUMN ${name} ${definition}`);
    if (name === "settled")
      await connection.query("UPDATE providerPayments SET settled=1 WHERE status IN ('completed','failed','cancelled','disputed')");
  }
  if (
    ["postgres", "postgresql", "neon"].includes(process.env.SQL_DIALECT) ||
    process.env.DATABASE_URL
  ) {
    await connection.query("CREATE UNIQUE INDEX IF NOT EXISTS provider_settlement_reference ON providerPayments (provider,mode,settlementRef)");
    const [[column]] = await connection.query(
      "SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cryptoDeposits' AND column_name = 'coinAmount'",
    );
    if (column && column.data_type !== "numeric")
      await connection.nativeQuery(
        'ALTER TABLE "cryptoDeposits" ALTER COLUMN "coinAmount" TYPE NUMERIC(20,2)',
      );
    await connection.query(
      "ALTER TABLE cardDeposits ADD COLUMN IF NOT EXISTS orderId VARCHAR(128) DEFAULT NULL",
    );
    await connection.query(
      "ALTER TABLE cardDeposits ADD COLUMN IF NOT EXISTS coinAmount NUMERIC(20,2) NOT NULL DEFAULT 0",
    );
    await connection.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_card_deposit_order ON cardDeposits (orderId)",
    );
    await connection.query(
      "CREATE INDEX IF NOT EXISTS idx_crypto_deposit_identity ON cryptoDeposits (currency, txId, userId)",
    );
    await connection.query(
      "CREATE INDEX IF NOT EXISTS idx_cashier_audit_target ON cashierAudit (action, targetId, createdAt)",
    );
  } else if ((process.env.SQL_DIALECT || "mysql") === "mysql") {
    const [indexes] = await connection.query("SHOW INDEX FROM providerPayments WHERE Key_name='provider_settlement_reference'");
    if (!indexes.length)
      await connection.query("CREATE UNIQUE INDEX provider_settlement_reference ON providerPayments (provider,mode,settlementRef)");
  }
}
// Provider transfers need a durable claim BEFORE network I/O. Call this only
// outside the request coordinator when crossing that external side-effect boundary.
async function durable(work) {
  if (require("./context").enabled) {
    if (require("./context").storage.getStore())
      throw new Error("PAYMENT_REQUIRES_DURABLE_BOUNDARY");
    return require("./serverless").run(work, { scopes: ["admin"] });
  }
  return work();
}
module.exports = { ensureCashierSchema, durable };
