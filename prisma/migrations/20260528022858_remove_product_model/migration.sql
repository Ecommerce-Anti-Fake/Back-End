-- Remove ProductModel as a persisted catalog entity. Product identity now lives
-- directly on Offer, SupplyBatch, and DistributionShipmentItem snapshots.

-- Preserve any legacy affiliate rows before removing the PRODUCT_MODEL enum value.
UPDATE "affiliate_program"
SET "scope_type" = CASE
  WHEN "offer_id" IS NOT NULL THEN 'OFFER'::"AffiliateScopeType"
  WHEN "brand_id" IS NOT NULL THEN 'BRAND'::"AffiliateScopeType"
  WHEN "owner_shop_id" IS NOT NULL THEN 'SHOP'::"AffiliateScopeType"
  ELSE 'PLATFORM'::"AffiliateScopeType"
END
WHERE "scope_type" = 'PRODUCT_MODEL'::"AffiliateScopeType";

-- Drop foreign keys that still point to product_model.
ALTER TABLE "offer" DROP CONSTRAINT IF EXISTS "offer_product_model_id_fkey";
ALTER TABLE "supply_batch" DROP CONSTRAINT IF EXISTS "supply_batch_product_model_id_fkey";
ALTER TABLE "distribution_shipment_item" DROP CONSTRAINT IF EXISTS "distribution_shipment_item_product_model_id_fkey";
ALTER TABLE "distribution_pricing_policy" DROP CONSTRAINT IF EXISTS "distribution_pricing_policy_product_model_id_fkey";
ALTER TABLE "affiliate_program" DROP CONSTRAINT IF EXISTS "affiliate_program_product_model_id_fkey";

-- Drop legacy indexes before dropping the columns.
DROP INDEX IF EXISTS "distribution_shipment_item_product_model_id_idx";
DROP INDEX IF EXISTS "distribution_pricing_policy_product_model_id_idx";
DROP INDEX IF EXISTS "affiliate_program_product_model_id_idx";

-- Drop legacy product_model_id columns. The replacement identity fields already
-- exist and were backfilled by previous migrations.
ALTER TABLE "offer" DROP COLUMN IF EXISTS "product_model_id";
ALTER TABLE "supply_batch" DROP COLUMN IF EXISTS "product_model_id";
ALTER TABLE "distribution_shipment_item" DROP COLUMN IF EXISTS "product_model_id";
ALTER TABLE "distribution_pricing_policy" DROP COLUMN IF EXISTS "product_model_id";
ALTER TABLE "affiliate_program" DROP COLUMN IF EXISTS "product_model_id";

DROP TABLE IF EXISTS "product_model";

-- PostgreSQL cannot remove a single enum value in-place. Recreate the enum
-- without PRODUCT_MODEL and cast affiliate_program.scope_type onto it.
ALTER TYPE "AffiliateScopeType" RENAME TO "AffiliateScopeType_old";
CREATE TYPE "AffiliateScopeType" AS ENUM ('PLATFORM', 'SHOP', 'BRAND', 'OFFER');
ALTER TABLE "affiliate_program"
  ALTER COLUMN "scope_type" TYPE "AffiliateScopeType"
  USING "scope_type"::text::"AffiliateScopeType";
DROP TYPE "AffiliateScopeType_old";
