ALTER TABLE sideways ADD COLUMN first_opened_at TEXT;

CREATE INDEX sideways_chain_opened_idx ON sideways(chain_id, first_opened_at);

CREATE TABLE analytics_devices (
  device_id_hash TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE request_limits (
  request_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK(request_count >= 0),
  expires_at INTEGER NOT NULL
);

CREATE INDEX request_limits_expires_idx ON request_limits(expires_at);
