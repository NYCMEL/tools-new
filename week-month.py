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
    "AAPL","AMD","AMZN","BLK","JPM","META","MRVL","MSFT","MU","NVDA",
    "QQQ","SNOW","SPCX","SPY","TSLA","PYPL","GOOGL","MMM","AVGO",
    "V","GOOG","UNH","CAT"
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
    return scalar(x.loc[x["Week"] == weeks[-2], "Low"].min())

def previous_month_low(df):
    x = df.copy()
    x.index = pd.to_datetime(x.index).tz_localize(None)
    x["Month"] = x.index.to_period("M")
    months = sorted(x["Month"].unique())
    if len(months) < 2:
        return None
    return scalar(x.loc[x["Month"] == months[-2], "Low"].min())

week_buys = []
month_buys = []

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

        current = scalar(h["Close"].iloc[-1])
        week_low = previous_week_low(h)
        month_low = previous_month_low(h)

        if week_low is not None and current < week_low:
            week_buys.append(symbol)

        if month_low is not None and current < month_low:
            month_buys.append(symbol)

    except Exception as e:
        print(f"{symbol}: {e}")

if not week_buys and not month_buys:
    print("NOTHING TO REPORT!")
else:
    if week_buys:
        print("\nW:", ",".join(week_buys))
    if month_buys:
        print("M:", ",".join(month_buys))
        print("\n")
