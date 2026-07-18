#!/usr/bin/python3

import yfinance as yf
import pandas as pd

WATCHLIST = [
    "AAPL","AMD","AMZN","BLK","JPM","META","MRVL","MSFT","MU","NVDA",
    "QQQ","SNOW","SPCX","SPY","TSLA","PYPL","GOOGL","MMM","AVGO",
    "V","GOOG","UNH","CAT"
]

def previous_week_low(hist):
    hist = hist.copy()
    hist["Date"] = hist.index.tz_localize(None)
    hist["Week"] = hist["Date"].dt.to_period("W-FRI")
    weeks = sorted(hist["Week"].unique())
    if len(weeks) < 2:
        return None
    prev = weeks[-2]
    return float(hist.loc[hist["Week"] == prev, "Low"].min())

def previous_month_low(hist):
    hist = hist.copy()
    hist["Date"] = hist.index.tz_localize(None)
    hist["Month"] = hist["Date"].dt.to_period("M")
    months = sorted(hist["Month"].unique())
    if len(months) < 2:
        return None
    prev = months[-2]
    return float(hist.loc[hist["Month"] == prev, "Low"].min())

signals = []

for symbol in WATCHLIST:
    try:
        h = yf.download(symbol, period="4mo", interval="1d",
                        auto_adjust=False, progress=False)
        if h.empty:
            continue

        current = float(h["Close"].iloc[-1])
        week_low = previous_week_low(h)
        month_low = previous_month_low(h)

        if week_low is not None and current < week_low:
            signals.append(f"WEEK BUY {symbol}")

        if month_low is not None and current < month_low:
            signals.append(f"MONTH BUY {symbol}")

    except Exception:
        pass

if signals:
    print("\n".join(signals))
else:
    print("NOTHING TO REPORT!")
