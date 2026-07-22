CREATE TYPE "VoucherFundingSource" AS ENUM ('PLATFORM', 'SHOP');

ALTER TABLE "voucher"
  ADD COLUMN "funding_source" "VoucherFundingSource" NOT NULL DEFAULT 'PLATFORM';

UPDATE "voucher"
SET "funding_source" = CASE WHEN "owner_type" = 'SHOP' THEN 'SHOP'::"VoucherFundingSource" ELSE 'PLATFORM'::"VoucherFundingSource" END;

ALTER TABLE "voucher"
  ALTER COLUMN "funding_source" DROP DEFAULT;
