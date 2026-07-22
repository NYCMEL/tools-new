# Stock Buy Signals

Electron desktop application that reproduces the supplied Python logic in JavaScript.

## Requirements

- Node.js 22 or newer
- npm
- Internet connection while scanning market data

## Install and run

1. Open Terminal in this folder.
2. Run `npm install`.
3. Run `npm start`.

## Logic

- Downloads four months of daily market data.
- Compares the latest close with the previous completed week low.
- Compares the latest close with the previous completed month low.
- Displays only W, M, or WM buy signals.

## Important

Yahoo Finance is an unofficial data source and can occasionally throttle or reject requests. Individual ticker failures appear in the application error panel without stopping the remaining scan.
