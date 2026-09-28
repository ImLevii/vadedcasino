const express = require("express");
const { sql } = require("../../../database");
const { perform, fail } = require("./actions");
const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search || "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()
      .slice(0, 64);
    const status = req.query.status || "";
    if (!["", "active", "redeemed"].includes(status))
      return res.status(400).json({ error: "INVALID_STATUS" });
    const clauses = ["1=1"],
      args = [];
    if (search) {
      clauses.push("g.code LIKE ?");
      args.push("%" + search + "%");
    }
    if (status)
      clauses.push(
        "g.redeemedAt IS " + (status === "active" ? "NULL" : "NOT NULL"),
      );
    const where = clauses.join(" AND ");
    const [[{ total }]] = await sql.query(
      "SELECT COUNT(*) AS total FROM giftCards g WHERE " + where,
      args,
    );
    const pages = Math.max(1, Math.ceil(Number(total) / 20)),
      page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
    const [data] = await sql.query(
      "SELECT g.id,g.code,g.amount,g.usd,g.redeemedAt,g.redeemedBy,g.notes,u.username AS redeemedByUsername FROM giftCards g LEFT JOIN users u ON u.id=g.redeemedBy WHERE " +
        where +
        " ORDER BY g.id DESC LIMIT ? OFFSET ?",
      [...args, 20, (page - 1) * 20],
    );
    res.json({ success: true, data, page, pages, total: Number(total) });
  } catch {
    res.status(500).json({ error: "CASHIER_UNAVAILABLE" });
  }
});
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id),
    { amount, notes } = req.body;
  if (!Number.isSafeInteger(id) || id < 1)
    return res.status(400).json({ error: "INVALID_ID" });
  if (!Number.isInteger(amount) || amount < 1 || amount > 1000)
    return res.status(400).json({ error: "INVALID_AMOUNT" });
  if (typeof notes !== "string" || notes.length > 500)
    return res.status(400).json({ error: "INVALID_NOTES" });
  try {
    const result = await perform(
      req.user,
      "giftcards.edit",
      id,
      req.body,
      async (connection) => {
        const [[card]] = await connection.query(
          "SELECT * FROM giftCards WHERE id=? FOR UPDATE",
          [id],
        );
        if (!card) return fail("NOT_FOUND", 404);
        if (card.redeemedAt && Number(card.amount) !== amount)
          return fail("GIFT_CARD_ALREADY_REDEEMED", 409);
        await connection.query(
          "UPDATE giftCards SET amount=?,notes=? WHERE id=?",
          [amount, notes, id],
        );
        return { success: true };
      },
    );
    res.status(result.status || 200).json(result);
  } catch {
    res.status(500).json({ error: "CASHIER_UNAVAILABLE" });
  }
});
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return res.status(400).json({ error: "INVALID_ID" });
  try {
    const result = await perform(
      req.user,
      "giftcards.revoke",
      id,
      req.body,
      async (connection) => {
        const [[card]] = await connection.query(
          "SELECT * FROM giftCards WHERE id=? FOR UPDATE",
          [id],
        );
        if (!card) return fail("NOT_FOUND", 404);
        if (card.redeemedAt) return fail("GIFT_CARD_ALREADY_REDEEMED", 409);
        await connection.query("DELETE FROM giftCards WHERE id=?", [id]);
        return { success: true };
      },
    );
    res.status(result.status || 200).json(result);
  } catch {
    res.status(500).json({ error: "CASHIER_UNAVAILABLE" });
  }
});
module.exports = router;
