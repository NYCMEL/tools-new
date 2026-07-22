import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const WATCHLIST = [
  "AAPL", "AMD", "AMZN", "AVGO", "BLK", "CAT", "GOOG", "GOOGL", "JPM", "MMM",
  "META", "MRVL", "MSFT", "MU", "NVDA", "ORCL", "PYPL", "QQQ", "SNOW", "SPCX",
  "SPY", "TSLA", "UNH", "V", "SKHY"
];

function fourMonthsAgo() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - 4);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function normalizedDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function weekEndingFridayKey(value) {
  const date = normalizedDate(value);
  if (!date) return null;
  const daysUntilFriday = (5 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilFriday);
  return date.toISOString().slice(0, 10);
}

function monthKey(value) {
  const date = normalizedDate(value);
  if (!date) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousPeriodLow(quotes, keyFunction) {
  const lows = new Map();

  for (const quote of quotes) {
    if (!quote || !Number.isFinite(quote.low)) continue;
    const key = keyFunction(quote.date);
    if (!key) continue;
    const existing = lows.get(key);
    lows.set(key, existing === undefined ? quote.low : Math.min(existing, quote.low));
  }

  const periods = [...lows.keys()].sort();
  if (periods.length < 2) return null;
  return lows.get(periods[periods.length - 2]) ?? null;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function analyzeSymbol(symbol) {
  const chart = await yahooFinance.chart(symbol, {
    period1: fourMonthsAgo(),
    period2: new Date(),
    interval: "1d",
    includePrePost: false,
    events: "div,splits"
  });

  const quotes = Array.isArray(chart?.quotes)
    ? chart.quotes
        .filter((quote) => quote?.date && Number.isFinite(quote.close))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  if (quotes.length === 0) return null;

  const current = quotes[quotes.length - 1].close;
  const weekLow = previousPeriodLow(quotes, weekEndingFridayKey);
  const monthLow = previousPeriodLow(quotes, monthKey);
  const buy = `${weekLow !== null && current < weekLow ? "W" : ""}${monthLow !== null && current < monthLow ? "M" : ""}`;

  return {
    ticker: symbol,
    current: round2(current),
    lastWeek: weekLow === null ? null : round2(weekLow),
    lastMonth: monthLow === null ? null : round2(monthLow),
    buy
  };
}

export async function scanWatchlist() {
  const results = [];
  const errors = [];

  for (const symbol of WATCHLIST) {
    try {
      const result = await analyzeSymbol(symbol);
      if (result?.buy) results.push(result);
    } catch (error) {
      errors.push({
        ticker: symbol,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  results.sort((a, b) => a.ticker.localeCompare(b.ticker));

  return {
    results,
    errors,
    scanned: WATCHLIST.length,
    updatedAt: new Date().toISOString()
  };
}
