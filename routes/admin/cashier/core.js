const express = require("express");
const path = require("path");
const { randomBytes } = require("node:crypto");
const { perform } = require("./actions");
const router = express.Router();
router.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../../../dist/index.html")),
);
router.use("/crypto", require("./crypto"));
router.use("/skindeck", require("./skindeck"));
router.use("/giftcards", require("./giftcards"));
router.post("/createGiftCards", async (req, res) => {
  try {
    const { quantity, amount } = req.body;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
      return res.status(400).json({ error: "INVALID_QUANTITY" });
    if (!Number.isInteger(amount) || amount < 1 || amount > 1000)
      return res.status(400).json({ error: "INVALID_AMOUNT" });
    const result = await perform(
      req.user,
      "giftcards.create",
      0,
      req.body,
      async (connection) => {
        const codes = Array.from({ length: quantity }, () =>
          randomBytes(12).toString("hex"),
        );
        await connection.query(
          "INSERT INTO giftCards (code, amount, usd) VALUES ?",
          [codes.map((code) => [code, amount, 1])],
        );
        return {
          success: true,
          amount,
          codes: codes.map((code) =>
            code
              .match(/.{1,4}/g)
              .join("-")
              .toUpperCase(),
          ),
        };
      },
    );
    // Codes are bearer assets: return only to the authenticated creator, never broadcast.
    res.status(result.status || 200).json(result);
  } catch {
    res.status(500).json({ error: "CASHIER_UNAVAILABLE" });
  }
});
module.exports = router;
