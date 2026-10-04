const {
  configuration,
  definition,
  availability,
  context,
} = require("./config");
const removedCatalog = () => ({
  available: false,
  reason: "PAYMENT_PROVIDER_REMOVED",
  currencies: [],
  coinRate: require("../crypto/deposit/functions").cryptoData.coinRate,
});
function legacyContext(resolve) {
  return async (req, res, next) => {
    const match = resolve(req);
    if (!match) return next();
    if (definition(match.id).retired) {
      if (req.method === "POST" && match.creation)
        return res.status(410).json({ error: "PAYMENT_PROVIDER_REMOVED" });
      if (req.method === "GET" && match.catalog)
        return res.json(removedCatalog());
    }
    try {
      const c = await configuration(match.id),
        reason = availability(c, match.type || "deposit");
      if (reason && req.method === "POST" && match.creation)
        return res.status(503).json({ error: reason });
      // Keep histories and signed callbacks operational when new payments are disabled.
      if (req.method === "GET" && match.catalog) {
        const json = res.json.bind(res);
        res.json = (value) =>
          json(
            reason
              ? {
                  ...value,
                  available: false,
                  reason,
                  ...(value.currencies
                    ? {
                        currencies: value.currencies.map((row) => ({
                          ...row,
                          available: false,
                        })),
                      }
                    : {}),
                }
              : value,
          );
      }
      context.run(c, next);
    } catch {
      res.status(503).json({ error: "PAYMENT_CONFIGURATION_UNAVAILABLE" });
    }
  };
}
const trading = legacyContext((req) => {
  const path = req.path.toLowerCase().replace(/\/+$/, "");
  if (path.startsWith("/crypto/deposit"))
    return {
      id: "coinpayments",
      type: "deposit",
      catalog: path === "/crypto/deposit" || path === "/crypto/deposit/",
      creation: path === "/crypto/deposit/wallet",
    };
  if (path.startsWith("/crypto/withdraw"))
    return {
      id: "mexc",
      type: "withdrawal",
      catalog: ["/crypto/withdraw", "/crypto/withdraw/"].includes(path),
      creation: ["/crypto/withdraw", "/crypto/withdraw/"].includes(path),
    };
  if (path.startsWith("/deposit/cc"))
    return {
      id: "zebra",
      type: "deposit",
      catalog: ["/deposit/cc", "/deposit/cc/"].includes(path),
      creation: ["/deposit/cc", "/deposit/cc/"].includes(path),
    };
  if (path.startsWith("/deposit/giftcards"))
    return {
      id: "giftcards",
      type: "deposit",
      creation: path.endsWith("/redeem"),
    };
  if (path.startsWith("/skindeck"))
    return {
      id: "skindeck",
      type:
        path.includes("/withdrawals") || path.includes("/skins")
          ? "withdrawal"
          : "deposit",
      creation: path.endsWith("/deposits") || path.endsWith("/withdrawals"),
    };
});
const admin = legacyContext((req) =>
  req.path.toLowerCase().startsWith("/crypto")
    ? {
        id: "mexc",
        type: "withdrawal",
        creation: /^\/crypto\/accept\//i.test(req.path),
      }
    : req.path.toLowerCase().startsWith("/skindeck")
      ? { id: "skindeck", type: "withdrawal" }
      : null,
);
module.exports = { trading, admin, removedCatalog };
