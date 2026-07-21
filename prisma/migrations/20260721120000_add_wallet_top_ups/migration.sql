CREATE TYPE "WalletTopUpStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

CREATE TABLE "wallet_top_up" (
  "id" TEXT NOT NULL,
  "wallet_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "order_code" TEXT NOT NULL,
  "payment_link_id" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "checkout_url" TEXT NOT NULL,
  "status" "WalletTopUpStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paid_at" TIMESTAMP(3),

  CONSTRAINT "wallet_top_up_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallet_top_up_idempotency_key_key" ON "wallet_top_up"("idempotency_key");
CREATE UNIQUE INDEX "wallet_top_up_order_code_key" ON "wallet_top_up"("order_code");
CREATE UNIQUE INDEX "wallet_top_up_payment_link_id_key" ON "wallet_top_up"("payment_link_id");
CREATE INDEX "wallet_top_up_wallet_id_created_at_idx" ON "wallet_top_up"("wallet_id", "created_at");

ALTER TABLE "wallet_top_up"
  ADD CONSTRAINT "wallet_top_up_wallet_id_fkey"
  FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
