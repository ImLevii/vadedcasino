export function formatNumber(num) {
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 1 coin = $0.70 USD (matches server robuxRate.usd). e.g. 5.00 coins = $3.50.
export const USD_PER_COIN = 0.7

export function coinsToUSD(coins) {
  return (Number(coins) || 0) * USD_PER_COIN
}

export function formatUSD(coins) {
  return coinsToUSD(coins).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}