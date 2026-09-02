-- Earlier releases capped a single gift at 1,000 NIM. Founder gifts are 5,000 NIM,
-- so preserve the exact stored Luna values while replacing only this column's check.
-- Keeping the sideways table itself in place avoids disturbing its foreign keys.
CREATE TABLE sideways_luna_migration (
  id TEXT PRIMARY KEY,
  payment_luna INTEGER
);

INSERT INTO sideways_luna_migration (id, payment_luna)
SELECT id, payment_luna FROM sideways;

ALTER TABLE sideways DROP COLUMN payment_luna;
ALTER TABLE sideways ADD COLUMN payment_luna INTEGER
  CHECK(payment_luna IS NULL OR payment_luna BETWEEN 1 AND 1000000000);

UPDATE sideways
SET payment_luna = (
  SELECT payment_luna
  FROM sideways_luna_migration
  WHERE sideways_luna_migration.id = sideways.id
);

DROP TABLE sideways_luna_migration;

CREATE TABLE founder_campaign_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sideways_id TEXT NOT NULL UNIQUE REFERENCES sideways(id),
  encrypted_gift TEXT NOT NULL,
  created_at TEXT NOT NULL,
  allocated_device_hash TEXT UNIQUE,
  allocated_at TEXT
);

CREATE INDEX founder_campaign_available_idx
ON founder_campaign_slots(allocated_at, id);
