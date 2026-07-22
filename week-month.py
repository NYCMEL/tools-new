#!/usr/bin/python3 -W ignore

import warnings

try:
    from urllib3.exceptions import NotOpenSSLWarning
    warnings.filterwarnings("ignore", category=NotOpenSSLWarning)
except Exception:
    pass

import yfinance as yf
import pandas as pd

WATCHLIST = [
    "AAPL","AMD","AMZN","AVGO","BLK","CAT","GOOG","GOOGL","JPM","MMM","META","MRVL",
    "MSFT","MU","NVDA","ORCL","PYPL","QQQ","SNOW","SPCX","SPY","TSLA","UNH","V","SKHY"
]


def scalar(value):
    """Return a native Python scalar."""
    try:
        return value.item()
    except Exception:
        try:
            return value.iloc[0]
        except Exception:
            return value


def previous_week_low(df):
    x = df.copy()
    x.index = pd.to_datetime(x.index).tz_localize(None)
    x["Week"] = x.index.to_period("W-FRI")

    weeks = sorted(x["Week"].unique())
    if len(weeks) < 2:
        return None

    return scalar(
        x.loc[x["Week"] == weeks[-2], "Low"].min()
    )


def previous_month_low(df):
    x = df.copy()
    x.index = pd.to_datetime(x.index).tz_localize(None)
    x["Month"] = x.index.to_period("M")

    months = sorted(x["Month"].unique())
    if len(months) < 2:
        return None

    return scalar(
        x.loc[x["Month"] == months[-2], "Low"].min()
    )


week_buys = []
month_buys = []
results = []

for symbol in WATCHLIST:

    try:

        h = yf.download(
            symbol,
            period="4mo",
            interval="1d",
            auto_adjust=False,
            progress=False,
            threads=False
        )

        if h.empty:
            print(f"{symbol}: no data")
            continue

        current = float(scalar(h["Close"].iloc[-1]))
        week_low = previous_week_low(h)
        month_low = previous_month_low(h)

        week_buy = (
            week_low is not None and current < week_low
        )

        month_buy = (
            month_low is not None and current < month_low
        )

        if week_buy:
            week_buys.append(symbol)

        if month_buy:
            month_buys.append(symbol)

        results.append({
            "Ticker": symbol,
            "Current": round(current, 2),
            "Prev Week Low": round(float(week_low), 2) if week_low is not None else None,
            "Prev Month Low": round(float(month_low), 2) if month_low is not None else None,
            "Week Buy": "YES" if week_buy else "",
            "Month Buy": "YES" if month_buy else ""
        })

    except Exception as e:
        print(f"{symbol}: {e}")

# ---------------------------------------------------
# Results Table
# ---------------------------------------------------

df = pd.DataFrame(results)
df = df.sort_values("Ticker")

print()
print(df.to_string(index=False))
print()

# ---------------------------------------------------
# Buy Lists
# ---------------------------------------------------

if week_buys:
    print("WEEK BUY")
    print(", ".join(sorted(week_buys)))
    print()

if month_buys:
    print("MONTH BUY")
    print(", ".join(sorted(month_buys)))
    print()

if not week_buys and not month_buys:
    print("NOTHING TO REPORT!")
