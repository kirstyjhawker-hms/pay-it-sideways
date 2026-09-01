CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX analytics_events_name_created_idx
ON analytics_events(event_name, created_at);
