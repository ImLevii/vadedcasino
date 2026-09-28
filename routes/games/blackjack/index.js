const router = require("express").Router();
const { sql } = require("../../../database");
const { isAuthed } = require("../../auth/functions");
router.use(isAuthed);
router.get("/", async (req, res) => {
  const [[active]] = await sql.query(
    "SELECT id, actions, amount FROM blackjack WHERE endedAt IS NULL AND userId = ?",
    [req.userId],
  );
  res.json({
    activeGame: active
      ? { ...active, actions: JSON.parse(active.actions || "[]") }
      : false,
    available: false,
  });
});
// Stand, double, split and insurance were empty handlers. Keep legacy stakes
// inspectable and refundable; don't debit new bets into an unfinished engine.
router.use((req, res) =>
  res.status(503).json({ error: "BLACKJACK_UNAVAILABLE" }),
);
module.exports = router;
