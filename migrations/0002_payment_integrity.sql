CREATE UNIQUE INDEX sideways_transaction_hash_unique
ON sideways(transaction_hash)
WHERE transaction_hash IS NOT NULL;
