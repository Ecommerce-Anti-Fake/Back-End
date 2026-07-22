ALTER TYPE "WithdrawalStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "WithdrawalStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "WithdrawalStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "PayoutAccountOwnerType" AS ENUM ('USER', 'SHOP');
CREATE TYPE "PayoutAccountVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'DISABLED');
CREATE TYPE "PayoutAccountVerificationMethod" AS ENUM ('MANUAL_BANK_APP', 'PROVIDER');
CREATE TYPE "WithdrawalAuthorizationChannel" AS ENUM ('PHONE', 'EMAIL');
CREATE TYPE "WithdrawalAuthorizationOperation" AS ENUM ('CREATE_PAYOUT_ACCOUNT', 'DELETE_PAYOUT_ACCOUNT', 'CREATE_WITHDRAWAL');

ALTER TABLE "shop" ADD COLUMN "verified_legal_name" TEXT;

CREATE TABLE "payout_account" (
    "id" TEXT NOT NULL,
    "owner_type" "PayoutAccountOwnerType" NOT NULL,
    "user_id" TEXT,
    "shop_id" TEXT,
    "bank_bin" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number_encrypted" TEXT NOT NULL,
    "account_number_hash" TEXT NOT NULL,
    "account_number_last4" TEXT NOT NULL,
    "account_number_length" INTEGER NOT NULL,
    "declared_account_holder" TEXT NOT NULL,
    "resolved_account_holder" TEXT,
    "verification_status" "PayoutAccountVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_method" "PayoutAccountVerificationMethod",
    "verified_by_user_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "available_after" TIMESTAMP(3) NOT NULL,
    "disabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payout_account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payout_account_owner_check" CHECK (
      ("owner_type" = 'USER' AND "user_id" IS NOT NULL AND "shop_id" IS NULL) OR
      ("owner_type" = 'SHOP' AND "shop_id" IS NOT NULL AND "user_id" IS NULL)
    )
);

CREATE TABLE "withdrawal_authorization" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "payout_account_id" TEXT,
    "operation" "WithdrawalAuthorizationOperation" NOT NULL,
    "channel" "WithdrawalAuthorizationChannel" NOT NULL,
    "operation_digest" TEXT NOT NULL,
    "authorization_token_hash" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "withdrawal_authorization_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "wallet_withdrawal"
  ALTER COLUMN "account_number" DROP NOT NULL,
  ADD COLUMN "payout_account_id" TEXT,
  ADD COLUMN "requested_by_user_id" TEXT,
  ADD COLUMN "processed_by_user_id" TEXT,
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "bank_bin" TEXT,
  ADD COLUMN "bank_code" TEXT,
  ADD COLUMN "account_number_encrypted_snapshot" TEXT,
  ADD COLUMN "account_number_last4" TEXT,
  ADD COLUMN "account_number_length" INTEGER,
  ADD COLUMN "transfer_reference" TEXT,
  ADD COLUMN "rejection_reason" TEXT,
  ADD COLUMN "approved_at" TIMESTAMP(3),
  ADD COLUMN "completed_at" TIMESTAMP(3),
  ADD COLUMN "cancelled_at" TIMESTAMP(3);

UPDATE "wallet_withdrawal"
SET "account_number_last4" = RIGHT("account_number", 4)
WHERE "account_number" IS NOT NULL;

CREATE UNIQUE INDEX "payout_account_user_id_bank_bin_account_number_hash_key" ON "payout_account"("user_id", "bank_bin", "account_number_hash");
CREATE UNIQUE INDEX "payout_account_shop_id_bank_bin_account_number_hash_key" ON "payout_account"("shop_id", "bank_bin", "account_number_hash");
CREATE INDEX "payout_account_owner_type_verification_status_idx" ON "payout_account"("owner_type", "verification_status");
CREATE UNIQUE INDEX "withdrawal_authorization_authorization_token_hash_key" ON "withdrawal_authorization"("authorization_token_hash");
CREATE INDEX "withdrawal_authorization_user_id_created_at_idx" ON "withdrawal_authorization"("user_id", "created_at");
CREATE INDEX "withdrawal_authorization_user_id_locked_until_idx" ON "withdrawal_authorization"("user_id", "locked_until");
CREATE INDEX "withdrawal_authorization_expires_at_idx" ON "withdrawal_authorization"("expires_at");
CREATE UNIQUE INDEX "wallet_withdrawal_idempotency_key_key" ON "wallet_withdrawal"("idempotency_key");
CREATE INDEX "wallet_withdrawal_payout_account_id_idx" ON "wallet_withdrawal"("payout_account_id");
CREATE INDEX "wallet_withdrawal_status_created_at_idx" ON "wallet_withdrawal"("status", "created_at");
CREATE INDEX "wallet_withdrawal_transfer_reference_idx" ON "wallet_withdrawal"("transfer_reference");

ALTER TABLE "payout_account" ADD CONSTRAINT "payout_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payout_account" ADD CONSTRAINT "payout_account_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payout_account" ADD CONSTRAINT "payout_account_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "withdrawal_authorization" ADD CONSTRAINT "withdrawal_authorization_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_authorization" ADD CONSTRAINT "withdrawal_authorization_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawal_authorization" ADD CONSTRAINT "withdrawal_authorization_payout_account_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "payout_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_withdrawal" ADD CONSTRAINT "wallet_withdrawal_payout_account_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "payout_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallet_withdrawal" ADD CONSTRAINT "wallet_withdrawal_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_withdrawal" ADD CONSTRAINT "wallet_withdrawal_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
