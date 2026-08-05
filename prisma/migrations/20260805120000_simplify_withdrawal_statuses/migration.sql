BEGIN;

-- Keep legacy records actionable when removing the intermediate/failed states.
UPDATE "wallet_withdrawal"
SET "status" = 'PROCESSING'
WHERE "status" IN ('APPROVED', 'FAILED');

CREATE TYPE "WithdrawalStatus_new" AS ENUM (
  'PENDING',
  'PROCESSING',
  'REJECTED',
  'COMPLETED',
  'CANCELLED'
);

ALTER TABLE "wallet_withdrawal"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "WithdrawalStatus_new"
    USING ("status"::text::"WithdrawalStatus_new"),
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"WithdrawalStatus_new";

DROP TYPE "WithdrawalStatus";
ALTER TYPE "WithdrawalStatus_new" RENAME TO "WithdrawalStatus";

COMMIT;
