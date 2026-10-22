-- Additive migration; existing payment history is untouched.
CREATE TABLE "order_payos_payment_attempt" (
 "payment_link_id" TEXT PRIMARY KEY,
 "order_id" TEXT NOT NULL REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "order_code" BIGINT NOT NULL UNIQUE,
 "amount" DECIMAL(18,2) NOT NULL,
 "checkout_url" TEXT NOT NULL,
 "qr_code" TEXT,
 "expires_at" TIMESTAMP(3) NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'PENDING',
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "last_checked_at" TIMESTAMP(3)
);
CREATE INDEX "order_payos_payment_attempt_order_id_created_at_idx" ON "order_payos_payment_attempt"("order_id", "created_at");
CREATE INDEX "order_payos_payment_attempt_status_last_checked_at_idx" ON "order_payos_payment_attempt"("status", "last_checked_at");
