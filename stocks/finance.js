import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export const WATCHLIST = [
  "AAPL", "AMD", "AMZN", "AVGO", "BLK", "CAT", "GOOG", "GOOGL", "JPM", "MMM",
  "META", "MRVL", "MSFT", "MU", "NVDA", "ORCL", "PYPL", "QQQ", "SNOW", "SPCX",
  "SPY", "TSLA", "UNH", "V", "SKHY"
];

function startDateFourMonthsAgo() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - 4);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function dateOnly(value) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function weekEndingFridayKey(value) {
  const date = dateOnly(value);
  const day = date.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilFriday);
  return date.toISOString().slice(0, 10);
}

function monthKey(value) {
  const date = dateOnly(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function previousPeriodLow(quotes, keyFunction) {
  const grouped = new Map();

  for (const quote of quotes) {
    if (!quote?.date || !Number.isFinite(quote.low)) continue;
    const key = keyFunction(quote.date);
    const currentLow = grouped.get(key);
    grouped.set(key, currentLow === undefined ? quote.low : Math.min(currentLow, quote.low));
  }

  const periods = [...grouped.keys()].sort();
  if (periods.length < 2) return null;
  return grouped.get(periods.at(-2)) ?? null;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function analyzeSymbol(symbol) {
  const chart = await yahooFinance.chart(symbol, {
    period1: startDateFourMonthsAgo(),
    period2: new Date(),
    interval: "1d",
    includePrePost: false,
    events: "div,splits"
  });

  const quotes = (chart?.quotes ?? [])
    .filter((quote) => quote?.date && Number.isFinite(quote.close))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (quotes.length === 0) return null;

  const current = quotes.at(-1).close;
  const weekLow = previousPeriodLow(quotes, weekEndingFridayKey);
  const monthLow = previousPeriodLow(quotes, monthKey);

  const weekBuy = weekLow !== null && current < weekLow;
  const monthBuy = monthLow !== null && current < monthLow;
  const buy = `${weekBuy ? "W" : ""}${monthBuy ? "M" : ""}`;

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
