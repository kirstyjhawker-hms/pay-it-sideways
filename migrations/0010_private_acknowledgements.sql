ALTER TABLE sideways ADD COLUMN acknowledgement TEXT
  CHECK(acknowledgement IS NULL OR acknowledgement IN ('made-me-smile', 'needed-this', 'thank-you'));

ALTER TABLE sideways ADD COLUMN acknowledged_at TEXT;

CREATE INDEX sideways_chain_acknowledgement_idx
ON sideways(chain_id, acknowledgement)
WHERE acknowledgement IS NOT NULL;
