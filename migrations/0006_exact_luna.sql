ALTER TABLE sideways ADD COLUMN payment_luna INTEGER
  CHECK(payment_luna IS NULL OR payment_luna BETWEEN 1 AND 100000000);

UPDATE sideways
SET payment_luna = CAST(ROUND(payment_amount * 100000) AS INTEGER)
WHERE includes_payment = 1 AND payment_amount IS NOT NULL;
