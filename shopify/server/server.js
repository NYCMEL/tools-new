/* server.js — Node.js + Express + better-sqlite3 backend for mtk-mina */
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(__dirname, "mtk-mina.db");

const app = express();
const db = new Database(DB_PATH);

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  medium TEXT,
  size TEXT,
  year INTEGER,
  price REAL NOT NULL,
  image TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  offer REAL NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS similar_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER,
  email TEXT NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  order_id TEXT,
  amount REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// ---------- Seed (only if empty) ----------
const count = db.prepare("SELECT COUNT(*) AS c FROM items").get().c;
if (count === 0) {
  const insert = db.prepare(`INSERT INTO items
    (title, description, medium, size, year, price, image, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const styles  = ["Abstract", "Floral", "Landscape", "Portrait", "Cubist"];
  const sizes   = ['12" × 16"', '16" × 20"', '18" × 24"', '24" × 36"'];
  const mediums = ["Oil on canvas", "Acrylic on canvas", "Mixed media", "Watercolor"];
  for (let i = 1; i <= 20; i++) {
    const n = String(i).padStart(2, "0");
    insert.run(
      `${styles[i % styles.length]} Study No. ${i}`,
      "Original one-of-a-kind hand painting. Signed by the artist.",
      mediums[i % mediums.length],
      sizes[i % sizes.length],
      2024,
      Math.round(80 + Math.random() * 420),
      `/images/painting-${n}.jpg`,
      i % 7 === 0 ? 0 : 1
    );
  }
  console.log("Seeded 20 paintings.");
}

// ---------- Middleware ----------
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "change-me-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 }
}));

function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: "unauthorized" });
}

// ---------- Public API ----------
app.get("/api/items", (req, res) => {
  const rows = db.prepare("SELECT * FROM items ORDER BY created_at DESC").all()
    .map((r) => ({ ...r, available: !!r.available }));
  res.json(rows);
});

app.get("/api/items/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM items WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not_found" });
  res.json({ ...row, available: !!row.available });
});

app.post("/api/offers", (req, res) => {
  const { itemId, email, offer, message } = req.body || {};
  if (!itemId || !email || !offer) return res.status(400).json({ error: "bad_request" });
  const info = db.prepare("INSERT INTO offers (item_id, email, offer, message) VALUES (?, ?, ?, ?)")
    .run(itemId, email, offer, message || "");
  res.json({ id: info.lastInsertRowid, status: "pending" });
});

app.post("/api/similar-requests", (req, res) => {
  const { itemId, email, message } = req.body || {};
  if (!email) return res.status(400).json({ error: "bad_request" });
  const info = db.prepare("INSERT INTO similar_requests (item_id, email, message) VALUES (?, ?, ?)")
    .run(itemId || null, email, message || "");
  res.json({ id: info.lastInsertRowid });
});

app.post("/api/orders", (req, res) => {
  const { itemId, orderId, amount } = req.body || {};
  if (!itemId) return res.status(400).json({ error: "bad_request" });
  db.prepare("INSERT INTO orders (item_id, order_id, amount) VALUES (?, ?, ?)").run(itemId, orderId || null, amount || null);
  // mark sold
  db.prepare("UPDATE items SET available = 0 WHERE id = ?").run(itemId);
  res.json({ ok: true });
});

// ---------- Auth ----------
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === "admin" && password === "test") {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "invalid_credentials" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  res.json({ admin: !!(req.session && req.session.admin) });
});

// ---------- Admin API ----------
app.post("/api/admin/items", requireAdmin, (req, res) => {
  const { title, description, medium, size, year, price, image, available } = req.body || {};
  if (!title || !price || !image) return res.status(400).json({ error: "bad_request" });
  const info = db.prepare(`INSERT INTO items (title, description, medium, size, year, price, image, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(title, description || "", medium || "", size || "", year || null, price, image, available ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});

app.put("/api/admin/items/:id", requireAdmin, (req, res) => {
  const { title, description, medium, size, year, price, image, available } = req.body || {};
  db.prepare(`UPDATE items SET title=?, description=?, medium=?, size=?, year=?, price=?, image=?, available=? WHERE id=?`)
    .run(title, description, medium, size, year, price, image, available ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/items/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/offers", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM offers ORDER BY created_at DESC").all());
});

app.post("/api/admin/offers/:id/reply", requireAdmin, (req, res) => {
  const { status } = req.body || {}; // 'accepted' | 'declined' | 'counter'
  db.prepare("UPDATE offers SET status = ? WHERE id = ?").run(status || "replied", req.params.id);
  res.json({ ok: true });
});

// ---------- Static ----------
app.use("/component", express.static(path.join(ROOT, "component")));
app.use("/images", express.static(path.join(ROOT, "public", "images")));
app.use("/admin", express.static(path.join(ROOT, "public", "admin")));
app.get("/", (_req, res) => res.sendFile(path.join(ROOT, "index.html")));

// ---------- Serve compiled SCSS as CSS on the fly (dev convenience) ----------
app.get("/component/mtk-mina.css", (_req, res) => {
  try {
    const sass = require("sass");
    const result = sass.compile(path.join(ROOT, "component", "mtk-mina.scss"));
    res.type("text/css").send(result.css);
  } catch (e) {
    // fallback: send raw scss as text if sass isn't installed
    res.type("text/css").send(fs.readFileSync(path.join(ROOT, "component", "mtk-mina.scss"), "utf8"));
  }
});

app.listen(PORT, () => console.log(`mtk-mina server on http://localhost:${PORT}`));
