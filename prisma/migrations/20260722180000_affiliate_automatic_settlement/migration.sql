CREATE TYPE "AffiliateSettlementMode" AS ENUM ('MANUAL', 'AUTOMATIC');

ALTER TABLE "affiliate_program"
ADD COLUMN "commission_hold_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "settlement_mode" "AffiliateSettlementMode" NOT NULL DEFAULT 'MANUAL';

-- Existing programs keep the legacy MANUAL workflow. New programs default to
-- AUTOMATIC and reserve commission from their owning shop's receivable.
ALTER TABLE "affiliate_program"
ALTER COLUMN "settlement_mode" SET DEFAULT 'AUTOMATIC';

ALTER TABLE "affiliate_commission_ledger"
ADD COLUMN "available_at" TIMESTAMP(3);

ALTER TABLE "affiliate_payout"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "affiliate_payout_idempotency_key_key"
ON "affiliate_payout"("idempotency_key");
