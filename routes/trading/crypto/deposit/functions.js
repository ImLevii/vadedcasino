const axios = require("axios");
const { sql } = require("../../../../database");
const { command } = require("./provider");
const cryptoData = {
  coinRate: { coins: 1, usd: 0.7 },
  currencies: {
    BTC: {
      id: "BTC",
      name: "Bitcoin",
      network: "Bitcoin",
      coingeckoId: "bitcoin",
      confirmations: 2,
    },
    ETH: {
      id: "ETH",
      name: "Ethereum",
      network: "Ethereum (ERC20)",
      coingeckoId: "ethereum",
      confirmations: 3,
    },
    LTC: {
      id: "LTC",
      name: "Litecoin",
      network: "Litecoin",
      coingeckoId: "litecoin",
      confirmations: 3,
    },
    "USDT.ERC20": {
      id: "USDT.ERC20",
      name: "Tether",
      network: "Ethereum (ERC20)",
      coingeckoId: "tether",
      confirmations: 3,
    },
    USDC: {
      id: "USDC",
      name: "USD Coin",
      network: "Ethereum (ERC20)",
      coingeckoId: "usd-coin",
      confirmations: 3,
    },
    "BNB.BSC": {
      id: "BNB.BSC",
      name: "BNB",
      network: "BNB Smart Chain (BEP20)",
      coingeckoId: "binancecoin",
      confirmations: 3,
    },
    DOGE: {
      id: "DOGE",
      name: "Dogecoin",
      network: "Dogecoin",
      coingeckoId: "dogecoin",
      confirmations: 3,
    },
  },
};
let refreshedAt = 0,
  pending;
async function cacheCryptos() {
  if (Date.now() - refreshedAt < 60000) return;
  if (pending) return pending;
  pending = (async () => {
    try {
      const { data } = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
          params: {
            ids: Object.values(cryptoData.currencies)
              .map((c) => c.coingeckoId)
              .join(","),
            vs_currencies: "usd",
          },
          timeout: 5000,
          maxRedirects: 0,
        },
      );
      const values = [];
      for (const currency of Object.values(cryptoData.currencies)) {
        const price = Number(data?.[currency.coingeckoId]?.usd);
        if (!Number.isFinite(price) || price <= 0) continue;
        currency.price = price;
        currency.quotedAt = Date.now();
        values.push([currency.id, currency.name, currency.coingeckoId, price]);
      }
      if (values.length)
        await sql.query(
          "INSERT INTO cryptos (id,name,coingeckoId,price) VALUES ? ON DUPLICATE KEY UPDATE name=VALUES(name),price=VALUES(price)",
          [values],
        );
      refreshedAt = Date.now();
    } catch {
      refreshedAt = Date.now() - 45000;
    }
  })().finally(() => (pending = null));
  return pending;
}
function current(currency) {
  return (
    !!currency &&
    Number.isFinite(currency.price) &&
    currency.price > 0 &&
    Date.now() - currency.quotedAt < 5 * 60 * 1000
  );
}
module.exports = {
  cryptoData,
  cacheCryptos,
  current,
  coinpayments: {
    getCallbackAddress: (args) => command("get_callback_address", args),
  },
};
