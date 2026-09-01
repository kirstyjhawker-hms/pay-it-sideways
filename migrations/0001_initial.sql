PRAGMA foreign_keys = ON;

CREATE TABLE chains (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  root_sideways_id TEXT NOT NULL
);

CREATE TABLE sideways (
  id TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL REFERENCES chains(id),
  parent_id TEXT REFERENCES sideways(id),
  created_at TEXT NOT NULL,
  recipient_token_hash TEXT NOT NULL UNIQUE,
  appreciation_reason TEXT NOT NULL CHECK(length(appreciation_reason) BETWEEN 3 AND 160),
  positive_message TEXT NOT NULL CHECK(length(positive_message) BETWEEN 8 AND 600),
  includes_payment INTEGER NOT NULL DEFAULT 0 CHECK(includes_payment IN (0, 1)),
  payment_currency TEXT,
  payment_amount REAL,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK(status IN ('delivered', 'reported')),
  kept_at TEXT
);

CREATE TABLE consents (
  sideways_id TEXT PRIMARY KEY REFERENCES sideways(id),
  allow_aggregate_tracking INTEGER NOT NULL DEFAULT 1 CHECK(allow_aggregate_tracking IN (0, 1)),
  allow_anonymous_quote INTEGER NOT NULL DEFAULT 0 CHECK(allow_anonymous_quote IN (0, 1))
);

CREATE INDEX sideways_chain_created_idx ON sideways(chain_id, created_at);
CREATE INDEX sideways_parent_idx ON sideways(parent_id);
