-- Keep the database enum aligned with the wallet schema and reconciliation query.
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'DISPUTE_HOLD';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'DISPUTE_RELEASE';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'DISPUTE_REFUND';
