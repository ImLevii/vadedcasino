const router = require("express").Router();
const { sql } = require("../../database");
const { can, present } = require("./access");
const { listGames, detail, json } = require("./operations-read");
const { perform, actions } = require("./operations-actions");

router.use((req, res, next) =>
  can(req.user, "games.view")
    ? next()
    : res.status(403).json({ error: "FORBIDDEN" }),
);
router.get("/", async (req, res) => {
  try {
    res.json(
      present(req.user, {
        ...(await listGames(sql, req.query)),
        permissions: req.permissions,
      }),
    );
  } catch (error) {
    console.error("[operations-read]", error.code || "FAILED");
    res
      .status(error.status || 503)
      .json({ error: error.status ? error.code : "OPERATIONS_UNAVAILABLE" });
  }
});
router.get("/audit", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const [rows] = await sql.query(
    "SELECT a.*, u.username FROM gameOperationAudit a LEFT JOIN users u ON u.id = a.adminId ORDER BY a.id DESC LIMIT 50 OFFSET ?",
    [(page - 1) * 50],
  );
  res.json(
    present(req.user, {
      success: true,
      data: rows.map((row) => ({
        ...row,
        stateBefore: json(row.stateBefore, {}),
        stateAfter: json(row.stateAfter, {}),
        parameters: json(row.parameters, {}),
      })),
      page,
      hasMore: rows.length === 50,
    }),
  );
});
router.get("/:game/:id", async (req, res) => {
  try {
    const data = await detail(sql, req.params.game, req.params.id);
    res.json(
      present(req.user, {
        success: true,
        data: { ...data, actions: actions(data, req.user) },
      }),
    );
  } catch (error) {
    res
      .status(error.status || 503)
      .json({ error: error.status ? error.code : "OPERATIONS_UNAVAILABLE" });
  }
});
router.post("/action", async (req, res) => {
  try {
    const result = await perform(req.user, req.body);
    res.status(result.status || 200).json(result);
  } catch (error) {
    res
      .status(error.status || 400)
      .json({ error: error.code || "INVALID_ACTION_REQUEST" });
  }
});
module.exports = router;
