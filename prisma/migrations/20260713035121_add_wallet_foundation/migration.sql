-- CreateEnum
CREATE TYPE "WalletOwnerType" AS ENUM ('USER', 'SHOP', 'PLATFORM');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('TOP_UP', 'PAYMENT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'REFUND', 'WITHDRAWAL', 'PLATFORM_FEE', 'AFFILIATE_COMMISSION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "WalletEntryDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "WalletBalanceType" AS ENUM ('AVAILABLE', 'PENDING', 'LOCKED');

-- CreateTable
CREATE TABLE "wallet" (
    "id" TEXT NOT NULL,
    "wallet_code" TEXT NOT NULL,
    "owner_type" "WalletOwnerType" NOT NULL,
    "user_id" TEXT,
    "shop_id" TEXT,
    "platform_code" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "available_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "locked_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transaction" (
    "id" TEXT NOT NULL,
    "transaction_code" TEXT NOT NULL,
    "transaction_type" "WalletTransactionType" NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "idempotency_key" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "wallet_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_ledger_entry" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "direction" "WalletEntryDirection" NOT NULL,
    "balance_type" "WalletBalanceType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance_before" DECIMAL(18,2) NOT NULL,
    "balance_after" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_wallet_code_key" ON "wallet"("wallet_code");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_platform_code_key" ON "wallet"("platform_code");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_user_id_currency_key" ON "wallet"("user_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_shop_id_currency_key" ON "wallet"("shop_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transaction_transaction_code_key" ON "wallet_transaction"("transaction_code");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transaction_idempotency_key_key" ON "wallet_transaction"("idempotency_key");

-- CreateIndex
CREATE INDEX "wallet_transaction_reference_type_reference_id_idx" ON "wallet_transaction"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "wallet_ledger_entry_wallet_id_created_at_idx" ON "wallet_ledger_entry"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_ledger_entry_transaction_id_idx" ON "wallet_ledger_entry"("transaction_id");

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entry" ADD CONSTRAINT "wallet_ledger_entry_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger_entry" ADD CONSTRAINT "wallet_ledger_entry_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
