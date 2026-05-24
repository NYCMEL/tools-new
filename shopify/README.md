# mtk-mina

A self-contained hand-painting gallery + sales web component.

## Stack

- **Front-end component**: vanilla JS class, SCSS (scoped to `.mtk-mina`), semantic HTML, Material Icons. JSON-driven via `mtk-mina.config.js`. Publishes/subscribes via `wc.publish` / `wc.subscribe` (a minimal shim is included if `window.wc` is missing).
- **Back-end**: Node.js + Express + SQLite (`better-sqlite3`). Admin login (username `admin`, password `test`), product CRUD, offers, similar-painting requests, PayPal order recording.
- **No frameworks. No Bootstrap at runtime. No external runtime libs** apart from Google Fonts/Material Icons + the PayPal SDK (loaded on demand at checkout).

## Files

```
mtk-mina/
├── index.html                      # minimal demo page
├── component/
│   ├── mtk-mina.config.js          # JSON config (data source)
│   ├── mtk-mina.html               # markup fragment for <wc-include>
│   ├── mtk-mina.scss               # scoped styles
│   └── mtk-mina.js                 # MtkMina class + auto-init
├── public/
│   ├── images/painting-01..20.jpg  # 20 test paintings
│   └── admin/                      # admin login + dashboard
└── server/
    ├── server.js                   # Express + SQLite API
    └── package.json
```

## Run

```bash
cd server
npm install
npm start
# open http://localhost:3000
# admin: http://localhost:3000/admin  (admin / test)
```

The server compiles `mtk-mina.scss` to CSS on the fly at `/component/mtk-mina.css`.

## Events

**Published** (logged via `wc.log` before publish):
- `mtk-mina:open`, `mtk-mina:close`, `mtk-mina:counter-offer`, `mtk-mina:buy`, `mtk-mina:request-similar`

**Subscribed** (handled by `onMessage`):
- `mtk-mina:refresh`, `mtk-mina:offer-reply`, `mtk-mina:order-status`, `mtk-mina:admin-update`

## Notes

- The component **waits for `<mtk-mina class="mtk-mina">` to appear in the DOM** (MutationObserver), so `<wc-include>` dynamic injection works.
- All styles are scoped to `.mtk-mina`. No global styles, no IDs in the component.
- For real PayPal sales replace `paypal.clientId` in `mtk-mina.config.js` with your live client ID and set `mode` to `live`.


## Local index.html demo fix

The root `index.html` now renders directly from `mtk-mina.config.js` local item data, so it displays when opened without the Node API. To use the SQLite backend, run the server and set `api.baseUrl` back to `/api`.
