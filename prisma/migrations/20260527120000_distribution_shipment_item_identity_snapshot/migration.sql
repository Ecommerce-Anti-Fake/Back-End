ALTER TABLE "distribution_shipment_item"
  ADD COLUMN "brand_id" TEXT,
  ADD COLUMN "category_id" TEXT,
  ADD COLUMN "model_name" TEXT,
  ADD COLUMN "gtin" TEXT,
  ADD COLUMN "verification_policy" TEXT;

UPDATE "distribution_shipment_item" AS dsi
SET
  "brand_id" = sb."brand_id",
  "category_id" = sb."category_id",
  "model_name" = sb."model_name",
  "gtin" = sb."gtin",
  "verification_policy" = sb."verification_policy"
FROM "supply_batch" AS sb
WHERE dsi."batch_id" = sb."id";

UPDATE "distribution_shipment_item" AS dsi
SET
  "brand_id" = pm."brand_id",
  "category_id" = pm."category_id",
  "model_name" = pm."model_name",
  "gtin" = pm."gtin",
  "verification_policy" = pm."verification_policy"
FROM "product_model" AS pm
WHERE dsi."product_model_id" = pm."id"
  AND dsi."brand_id" IS NULL;

ALTER TABLE "distribution_shipment_item"
  ALTER COLUMN "brand_id" SET NOT NULL,
  ALTER COLUMN "category_id" SET NOT NULL,
  ALTER COLUMN "model_name" SET NOT NULL,
  ALTER COLUMN "verification_policy" SET NOT NULL,
  ALTER COLUMN "product_model_id" DROP NOT NULL;

CREATE INDEX "distribution_shipment_item_brand_id_idx" ON "distribution_shipment_item"("brand_id");
CREATE INDEX "distribution_shipment_item_category_id_idx" ON "distribution_shipment_item"("category_id");

ALTER TABLE "distribution_shipment_item"
  ADD CONSTRAINT "distribution_shipment_item_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brand"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "distribution_shipment_item"
  ADD CONSTRAINT "distribution_shipment_item_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
