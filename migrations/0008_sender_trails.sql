CREATE TABLE trail_access (
  token_hash TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL REFERENCES chains(id),
  created_at TEXT NOT NULL
);

CREATE INDEX trail_access_chain_idx ON trail_access(chain_id);
