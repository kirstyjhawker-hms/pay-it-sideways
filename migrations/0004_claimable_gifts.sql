ALTER TABLE sideways ADD COLUMN payment_mode TEXT
  CHECK(payment_mode IS NULL OR payment_mode IN ('direct', 'claimable'));
ALTER TABLE sideways ADD COLUMN gift_address TEXT;
ALTER TABLE sideways ADD COLUMN payment_network TEXT
  CHECK(payment_network IS NULL OR payment_network IN ('main', 'test'));
ALTER TABLE sideways ADD COLUMN claim_transaction_hash TEXT;
ALTER TABLE sideways ADD COLUMN claimed_at TEXT;

UPDATE sideways
SET payment_mode = 'direct'
WHERE includes_payment = 1 AND payment_mode IS NULL;

CREATE UNIQUE INDEX sideways_claim_transaction_hash_unique
ON sideways(claim_transaction_hash)
WHERE claim_transaction_hash IS NOT NULL;
