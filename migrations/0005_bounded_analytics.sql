CREATE TABLE analytics_daily (
  event_name TEXT NOT NULL,
  event_day TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0 CHECK(event_count >= 0),
  PRIMARY KEY (event_name, event_day)
);

INSERT INTO analytics_daily (event_name, event_day, event_count)
SELECT event_name, substr(created_at, 1, 10), COUNT(*)
FROM analytics_events
GROUP BY event_name, substr(created_at, 1, 10);

DROP TABLE analytics_events;
