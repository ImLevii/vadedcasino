const test = require("node:test");
const assert = require("node:assert/strict");
const { PGlite } = require("@electric-sql/pglite");
const { buildSchema } = require("../database/postgres-sql");
const { createQuery } = require("../database/postgres");
const { ensureCashierSchema } = require("../runtime/cashier");

test("cashier upgrades early provider tables without reopening completed payments and can run twice", async (t) => {
  const previousDialect = process.env.SQL_DIALECT;
  process.env.SQL_DIALECT = "postgres";
  t.after(() => {
    if (previousDialect === undefined) delete process.env.SQL_DIALECT;
    else process.env.SQL_DIALECT = previousDialect;
  });
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(buildSchema());
  await db.exec('ALTER TABLE "providerPayments" DROP COLUMN "settled", DROP COLUMN "settlementRef", DROP COLUMN "flow"');
  const connection = { query: createQuery(db), nativeQuery: (...args) => db.query(...args) };
  for (const [id, status] of [[1, "completed"], [2, "creating"], [3, "cancelled"]])
    await connection.query("INSERT INTO providerPayments (id,requestId,userId,provider,mode,type,status,coins,fiatCents) VALUES (?,?,1,'stripe','live','deposit',?,15,1050)", [id, "legacy-payment-" + id, status]);
  await ensureCashierSchema(connection);
  await ensureCashierSchema(connection);
  const [rows] = await connection.query("SELECT id,status,settled,settlementRef,flow FROM providerPayments ORDER BY id");
  assert.deepEqual(rows, [
    { id: 1, status: "completed", settled: 1, settlementRef: null, flow: "api" },
    { id: 2, status: "creating", settled: 0, settlementRef: null, flow: "api" },
    { id: 3, status: "cancelled", settled: 1, settlementRef: null, flow: "api" },
  ]);
  const indexes = await db.query("SELECT indexname FROM pg_indexes WHERE tablename='providerPayments'");
  assert.ok(indexes.rows.some(row => row.indexname === "provider_settlement_reference"));
});
