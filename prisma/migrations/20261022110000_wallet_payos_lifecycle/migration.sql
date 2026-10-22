ALTER TYPE "WalletTopUpStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TABLE "wallet_top_up" ADD COLUMN "qr_code" TEXT, ADD COLUMN "expires_at" TIMESTAMP(3), ADD COLUMN "last_reconciled_at" TIMESTAMP(3);
CREATE INDEX "wallet_top_up_status_last_reconciled_at_idx" ON "wallet_top_up"("status", "last_reconciled_at");
