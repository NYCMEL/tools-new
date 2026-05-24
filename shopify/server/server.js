const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "mtk-storefront.sqlite"));

app.use(cors());
app.use(express.json());

db.exec(`
CREATE TABLE IF NOT EXISTS paintings (
  id INTEGER PRIMARY KEY,
  sku TEXT,
  title TEXT NOT NULL,
  description TEXT,
  medium TEXT,
  dimensions TEXT,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  availability TEXT DEFAULT 'available',
  image TEXT,
  category TEXT,
  paypal_item_name TEXT,
  tags TEXT
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  painting_id INTEGER,
  name TEXT,
  email TEXT,
  amount REAL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  painting_id INTEGER,
  name TEXT,
  email TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

app.get("/api/paintings", (req, res) => {
  const rows = db.prepare("SELECT * FROM paintings ORDER BY id").all();
  res.json(rows.map(mapPainting));
});

app.post("/api/paintings", (req, res) => {
  const item = req.body;
  db.prepare(`
    INSERT INTO paintings (id, sku, title, description, medium, dimensions, price, currency, availability, image, category, paypal_item_name, tags)
    VALUES (@id, @sku, @title, @description, @medium, @dimensions, @price, @currency, @availability, @image, @category, @paypal_item_name, @tags)
    ON CONFLICT(id) DO UPDATE SET
      sku = excluded.sku,
      title = excluded.title,
      description = excluded.description,
      medium = excluded.medium,
      dimensions = excluded.dimensions,
      price = excluded.price,
      currency = excluded.currency,
      availability = excluded.availability,
      image = excluded.image,
      category = excluded.category,
      paypal_item_name = excluded.paypal_item_name,
      tags = excluded.tags
  `).run(normalizePainting(item));
  res.json({ ok: true, id: item.id });
});

app.delete("/api/paintings/:id", (req, res) => {
  db.prepare("DELETE FROM paintings WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/offers", (req, res) => {
  const body = req.body;
  const result = db.prepare("INSERT INTO offers (painting_id, name, email, amount, message) VALUES (?, ?, ?, ?, ?)")
    .run(body.paintingId, body.name, body.email, body.amount, body.message || "");
  res.json({ ok: true, id: result.lastInsertRowid });
});

app.post("/api/requests", (req, res) => {
  const body = req.body;
  const result = db.prepare("INSERT INTO requests (painting_id, name, email, message) VALUES (?, ?, ?, ?)")
    .run(body.paintingId, body.name, body.email, body.message || "");
  res.json({ ok: true, id: result.lastInsertRowid });
});

function normalizePainting(item) {
  return {
    id: item.id,
    sku: item.sku || "",
    title: item.title || "",
    description: item.description || "",
    medium: item.medium || "",
    dimensions: item.dimensions || "",
    price: Number(item.price || 0),
    currency: item.currency || "USD",
    availability: item.availability || "available",
    image: item.image || "",
    category: item.category || "",
    paypal_item_name: item.paypalItemName || item.paypal_item_name || item.title || "",
    tags: Array.isArray(item.tags) ? JSON.stringify(item.tags) : (item.tags || "[]")
  };
}

function mapPainting(row) {
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    description: row.description,
    medium: row.medium,
    dimensions: row.dimensions,
    price: row.price,
    currency: row.currency,
    availability: row.availability,
    image: row.image,
    category: row.category,
    paypalItemName: row.paypal_item_name,
    tags: JSON.parse(row.tags || "[]")
  };
}

app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`);
});
