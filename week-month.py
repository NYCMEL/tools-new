#!/usr/bin/python3

import yfinance as yf

WATCHLIST = [
    "AAPL","AMD","AMZN","BLK","JPM","META","MRVL","MSFT","MU","NVDA",
    "QQQ","SNOW","SPCX","SPY","TSLA","PYPL","GOOGL","MMM","AVGO",
    "V","GOOG","UNH","CAT"
]

def scalar(value):
    """Return a Python scalar from pandas/NumPy objects."""
    try:
        return value.item()
    except Exception:
        try:
            return value.iloc[0]
        except Exception:
            return value

def previous_week_low(df):
    x = df.copy()
    x["Date"] = x.index.tz_localize(None)
    x["Week"] = x["Date"].dt.to_period("W-FRI")
    weeks = sorted(x["Week"].unique())
    if len(weeks) < 2:
        return None
    return scalar(x.loc[x["Week"] == weeks[-2], "Low"].min())

def previous_month_low(df):
    x = df.copy()
    x["Date"] = x.index.tz_localize(None)
    x["Month"] = x["Date"].dt.to_period("M")
    months = sorted(x["Month"].unique())
    if len(months) < 2:
        return None
    return scalar(x.loc[x["Month"] == months[-2], "Low"].min())

signals = []

for symbol in WATCHLIST:
    try:
        h = yf.download(
            symbol,
            period="4mo",
            interval="1d",
            auto_adjust=False,
            progress=False
        )

        if h.empty:
            continue

        current = scalar(h["Close"].iloc[-1])
        week_low = previous_week_low(h)
        month_low = previous_month_low(h)

        if week_low is not None and current < week_low:
            signals.append(f"WEEK BUY {symbol}")

        if month_low is not None and current < month_low:
            signals.append(f"MONTH BUY {symbol}")

    except Exception as e:
        print(f"{symbol}: {e}")

if signals:
    print("\n".join(signals))
else:
    print("NOTHING TO REPORT!")
