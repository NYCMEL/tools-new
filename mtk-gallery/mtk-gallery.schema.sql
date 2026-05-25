CREATE TABLE IF NOT EXISTS paintings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  price REAL NOT NULL,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'unavailable')),
  dimensions TEXT NOT NULL,
  medium TEXT NOT NULL,
  category TEXT NOT NULL,
  paypal_item_name TEXT NOT NULL,
  paypal_sku TEXT NOT NULL,
  paypal_shipping REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  painting_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  offer REAL NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (painting_id) REFERENCES paintings(id)
);

CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  painting_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  budget REAL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (painting_id) REFERENCES paintings(id)
);
