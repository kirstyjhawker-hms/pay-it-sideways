-- Earlier releases capped a single gift at 1,000 NIM. Founder gifts are 5,000 NIM,
-- so rebuild the table with the same constraints and a 10,000 NIM ceiling.
-- Deferring foreign-key checks keeps existing consents and self-references valid
-- while the replacement table is swapped into place.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE sideways_with_larger_gifts (
  id TEXT PRIMARY KEY,
  chain_id TEXT NOT NULL REFERENCES chains(id),
  parent_id TEXT REFERENCES sideways_with_larger_gifts(id),
  created_at TEXT NOT NULL,
  recipient_token_hash TEXT NOT NULL UNIQUE,
  appreciation_reason TEXT NOT NULL CHECK(length(appreciation_reason) BETWEEN 3 AND 160),
  positive_message TEXT NOT NULL CHECK(length(positive_message) BETWEEN 8 AND 600),
  includes_payment INTEGER NOT NULL DEFAULT 0 CHECK(includes_payment IN (0, 1)),
  payment_currency TEXT,
  payment_amount REAL,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK(status IN ('delivered', 'reported')),
  kept_at TEXT,
  payment_mode TEXT CHECK(payment_mode IS NULL OR payment_mode IN ('direct', 'claimable')),
  gift_address TEXT,
  payment_network TEXT CHECK(payment_network IS NULL OR payment_network IN ('main', 'test')),
  claim_transaction_hash TEXT,
  claimed_at TEXT,
  payment_luna INTEGER CHECK(payment_luna IS NULL OR payment_luna BETWEEN 1 AND 1000000000),
  pending_claim_transaction_hash TEXT,
  pending_claim_transaction TEXT,
  pending_claim_created_at TEXT,
  pending_claim_validity_start_height INTEGER,
  first_opened_at TEXT
);

INSERT INTO sideways_with_larger_gifts (
  id, chain_id, parent_id, created_at, recipient_token_hash,
  appreciation_reason, positive_message, includes_payment, payment_currency,
  payment_amount, transaction_hash, status, kept_at, payment_mode, gift_address,
  payment_network, claim_transaction_hash, claimed_at, payment_luna,
  pending_claim_transaction_hash, pending_claim_transaction,
  pending_claim_created_at, pending_claim_validity_start_height, first_opened_at
)
SELECT
  id, chain_id, parent_id, created_at, recipient_token_hash,
  appreciation_reason, positive_message, includes_payment, payment_currency,
  payment_amount, transaction_hash, status, kept_at, payment_mode, gift_address,
  payment_network, claim_transaction_hash, claimed_at, payment_luna,
  pending_claim_transaction_hash, pending_claim_transaction,
  pending_claim_created_at, pending_claim_validity_start_height, first_opened_at
FROM sideways;

DROP TABLE sideways;
ALTER TABLE sideways_with_larger_gifts RENAME TO sideways;

CREATE INDEX sideways_chain_created_idx ON sideways(chain_id, created_at);
CREATE INDEX sideways_parent_idx ON sideways(parent_id);
CREATE UNIQUE INDEX sideways_transaction_hash_unique
ON sideways(transaction_hash) WHERE transaction_hash IS NOT NULL;
CREATE UNIQUE INDEX sideways_claim_transaction_hash_unique
ON sideways(claim_transaction_hash) WHERE claim_transaction_hash IS NOT NULL;
CREATE UNIQUE INDEX sideways_pending_claim_hash_unique
ON sideways(pending_claim_transaction_hash) WHERE pending_claim_transaction_hash IS NOT NULL;
CREATE INDEX sideways_chain_opened_idx ON sideways(chain_id, first_opened_at);

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
