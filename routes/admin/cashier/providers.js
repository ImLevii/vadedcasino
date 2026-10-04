const express = require("express");
const { sql } = require("../../../database");
const { durable } = require("../../../runtime/cashier");
const { can } = require("../access");
const actions = require("./actions");
const config = require("../../trading/providers/config"),
  clients = require("../../trading/providers/clients"),
  service = require("../../trading/providers/service");
const router = express.Router();
const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res)).catch(next);
router.use((req, res, next) =>
  can(req.user, "finance.view") && can(req.user, "settings.manage")
    ? next()
    : res.status(403).json({ error: "FORBIDDEN" }),
);
router.get(
  "/",
  route(async (req, res) =>
    res.json({
      providers: await Promise.all(
        Object.keys(config.definitions).map(config.present),
      ),
    }),
  ),
);
router.put(
  "/:provider",
  route(async (req, res) => {
    const result = await durable(() =>
      config.save(req.user, req.params.provider, req.body),
    );
    res.status(result.status || 200).json(result);
  }),
);
router.post(
  "/:provider/check",
  route(async (req, res) => {
    const c = await config.configuration(req.params.provider);
    if (c.definition.retired)
      throw config.fail("PAYMENT_PROVIDER_REMOVED", 410);
    if (
      config.requiredCredentials(c, c.withdrawalsEnabled ? "withdrawal" : "deposit").some((key) => !c.credentials[key]) &&
      !(c.id === "skindeck" && c.mode === "sandbox")
    )
      throw config.fail("PAYMENT_PROVIDER_UNCONFIGURED", 503);
    const result = await clients.probe(c);
    res.json(result);
  }),
);
router.get(
  "/transactions",
  route(async (req, res) => {
    const clauses = ["1=1"],
      args = [];
    for (const [key, allowed] of [
      ["provider", ["paypal", "stripe", "applepay", "cashapp"]],
      ["type", ["deposit", "withdrawal"]],
      ["mode", ["live", "sandbox"]],
      [
        "status",
        [
          "creating",
          "awaiting_payment",
          "queued",
          "sending",
          "unknown",
          "completed",
          "failed",
          "cancelled",
          "disputed",
        ],
      ],
    ]) {
      if (req.query[key]) {
        if (!allowed.includes(req.query[key]))
          throw config.fail("INVALID_PAYMENT_FILTER");
        clauses.push("p." + key + "=?");
        args.push(req.query[key]);
      }
    }
    const search = String(req.query.search || "")
      .trim()
      .slice(0, 128);
    if (search) {
      clauses.push(
        "(LOWER(u.username) LIKE ? OR p.requestId=? OR p.providerRef=? OR p.userId=?)",
      );
      args.push(
        "%" + search.toLowerCase() + "%",
        search,
        search,
        /^\d{1,18}$/.test(search) ? search : 0,
      );
    }
    const where = clauses.join(" AND "),
      [[{ total }]] = await sql.query(
        "SELECT COUNT(*) AS total FROM providerPayments p JOIN users u ON u.id=p.userId WHERE " +
          where,
        args,
      );
    const pages = Math.max(1, Math.ceil(Number(total) / 20)),
      page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
    const [data] = await sql.query(
      "SELECT p.*,u.username FROM providerPayments p JOIN users u ON u.id=p.userId WHERE " +
        where +
        " ORDER BY p.id DESC LIMIT 20 OFFSET ?",
      [...args, (page - 1) * 20],
    );
    res.json({ data, total: Number(total), page, pages });
  }),
);
router.get(
  "/audit",
  route(async (req, res) => {
    const [data] = await sql.query(
      "SELECT requestId,adminId,action,targetId,reason,result,createdAt FROM cashierAudit WHERE action LIKE 'provider.%' ORDER BY createdAt DESC LIMIT 100",
    );
    res.json({ data });
  }),
);
for (const action of ["accept", "deny", "reconcile", "approve-email", "reject-email"])
  router.post(
    "/transactions/:id/" + action,
    route(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1)
        throw config.fail("INVALID_PAYMENT_ID");
      let result;
      if (action !== "reconcile")
        result = await service[{ "approve-email": "approveEmailDeposit", "reject-email": "rejectEmailDeposit" }[action] || action](req.user, id, req.body);
      else {
        const snapshot = await service.payment(id);
        const claim = await durable(() =>
          actions.perform(
            req.user,
            "provider.reconcile",
            id,
            req.body,
            async () => ({ success: true, started: true }),
          ),
        );
        if (claim.error || claim.replayed)
          return res.status(claim.status || 200).json(claim);
        try {
          result = await service.reconcile(snapshot);
        } catch (error) {
          result = {
            error: error.code || "PAYMENT_PROVIDER_REQUEST_UNCONFIRMED",
            status: error.status || 503,
          };
        }
        await durable(() =>
          sql.query(
            "UPDATE cashierAudit SET result=?,updatedAt=NOW() WHERE requestId=?",
            [JSON.stringify(result), req.body.requestId],
          ),
        );
      }
      res.status(result?.status || 200).json(result);
    }),
  );
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res
    .status(error.status || 503)
    .json({ error: error.code || "PAYMENT_SERVICE_UNAVAILABLE" });
});
module.exports = router;
