ALTER TABLE sideways ADD COLUMN pending_claim_transaction_hash TEXT;
ALTER TABLE sideways ADD COLUMN pending_claim_transaction TEXT;
ALTER TABLE sideways ADD COLUMN pending_claim_created_at TEXT;
ALTER TABLE sideways ADD COLUMN pending_claim_validity_start_height INTEGER;

CREATE UNIQUE INDEX sideways_pending_claim_hash_unique
ON sideways(pending_claim_transaction_hash)
WHERE pending_claim_transaction_hash IS NOT NULL;
