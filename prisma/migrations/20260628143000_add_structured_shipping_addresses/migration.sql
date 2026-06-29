ALTER TABLE "user_address"
  ADD COLUMN "province_code" TEXT,
  ADD COLUMN "province_name" TEXT,
  ADD COLUMN "ward_code" TEXT,
  ADD COLUMN "ward_name" TEXT;

ALTER TABLE "shop"
  ADD COLUMN "warehouse_address" TEXT,
  ADD COLUMN "warehouse_province_code" TEXT,
  ADD COLUMN "warehouse_province_name" TEXT,
  ADD COLUMN "warehouse_ward_code" TEXT,
  ADD COLUMN "warehouse_ward_name" TEXT;
