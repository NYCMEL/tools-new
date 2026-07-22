# Stock Buy Signals

A standalone Electron desktop application that reproduces the supplied Python logic in JavaScript.

## Requirements

- Node.js 22 or newer
- Internet connection while scanning market data

## Install and run

Open Terminal in this folder and run:

```bash
npm install
npm start
```

## Logic

For each ticker, the app downloads approximately four months of daily Yahoo Finance data and compares the latest closing price with:

- the minimum low from the previous weekly period ending Friday
- the minimum low from the previous calendar month

Signals:

- `W`: current close is below the previous week's low
- `M`: current close is below the previous month's low
- `WM`: both conditions are true

Only tickers with a buy signal are displayed. Results are sorted alphabetically.

## Notes

Yahoo Finance data is accessed through the unofficial `yahoo-finance2` package. Availability and data consistency are not guaranteed by Yahoo. This tool is informational and is not financial advice.
