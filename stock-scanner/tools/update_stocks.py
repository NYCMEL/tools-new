#!/usr/bin/env python3

from __future__ import annotations

import csv
import io
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

WATCHLIST = [
    "AAPL", "AMD", "AMZN", "AVGO", "BLK", "CAT", "GOOG", "GOOGL", "JPM", "MMM",
    "META", "MRVL", "MSFT", "MU", "NVDA", "ORCL", "PYPL", "QQQ", "SNOW", "SPCX",
    "SPY", "TSLA", "UNH", "V", "SKHY"
]

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_FILE = ROOT / "data" / "stocks.json"
USER_AGENT = "Mozilla/5.0 StockScanner/1.0"
REQUEST_DELAY_SECONDS = 0.25
TIMEOUT_SECONDS = 30


def stooq_symbol(symbol: str) -> str:
    return f"{symbol.lower()}.us"


def fetch_csv(symbol: str) -> str:
    url = f"https://stooq.com/q/d/l/?s={stooq_symbol(symbol)}&i=d"
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        text = response.read().decode("utf-8-sig", errors="replace")

    if "No data" in text or not text.strip():
        raise ValueError("No data returned")

    return text


def parse_rows(text: str) -> list[dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, Any]] = []

    for row in reader:
        try:
            date = datetime.strptime(row["Date"], "%Y-%m-%d")
            low = float(row["Low"])
            close = float(row["Close"])
        except (KeyError, TypeError, ValueError):
            continue

        rows.append({"date": date, "low": low, "close": close})

    rows.sort(key=lambda item: item["date"])

    if not rows:
        raise ValueError("No valid OHLC rows found")

    return rows


def previous_week_low(rows: list[dict[str, Any]]) -> float | None:
    groups: dict[str, list[float]] = {}

    for row in rows:
        year, week, _ = row["date"].isocalendar()
        groups.setdefault(f"{year}-{week:02d}", []).append(row["low"])

    keys = sorted(groups)
    if len(keys) < 2:
        return None

    return min(groups[keys[-2]])


def previous_month_low(rows: list[dict[str, Any]]) -> float | None:
    groups: dict[str, list[float]] = {}

    for row in rows:
        key = row["date"].strftime("%Y-%m")
        groups.setdefault(key, []).append(row["low"])

    keys = sorted(groups)
    if len(keys) < 2:
        return None

    return min(groups[keys[-2]])


def scan_symbol(symbol: str) -> dict[str, Any] | None:
    rows = parse_rows(fetch_csv(symbol))
    current = rows[-1]["close"]
    week_low = previous_week_low(rows)
    month_low = previous_month_low(rows)

    if week_low is None or month_low is None:
        return None

    buy = ""
    if current < week_low:
        buy += "W"
    if current < month_low:
        buy += "M"

    if not buy:
        return None

    return {
        "ticker": symbol,
        "current": round(current, 2),
        "week": round(week_low, 2),
        "month": round(month_low, 2),
        "buy": buy,
    }


def main() -> None:
    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for index, symbol in enumerate(WATCHLIST, start=1):
        print(f"[{index}/{len(WATCHLIST)}] {symbol}")

        try:
            result = scan_symbol(symbol)
            if result:
                results.append(result)
        except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as error:
            errors.append({"ticker": symbol, "error": str(error)})
            print(f"  Error: {error}")

        time.sleep(REQUEST_DELAY_SECONDS)

    results.sort(key=lambda item: item["ticker"])

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Stooq",
        "scanned": len(WATCHLIST),
        "signals": len(results),
        "results": results,
        "errors": errors,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"Wrote {OUTPUT_FILE}")
    print(f"Signals: {len(results)}")
    print(f"Errors: {len(errors)}")


if __name__ == "__main__":
    main()
