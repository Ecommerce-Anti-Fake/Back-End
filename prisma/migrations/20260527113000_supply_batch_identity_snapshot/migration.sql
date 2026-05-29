ALTER TABLE "supply_batch"
  ADD COLUMN "brand_id" TEXT,
  ADD COLUMN "category_id" TEXT,
  ADD COLUMN "model_name" TEXT,
  ADD COLUMN "gtin" TEXT,
  ADD COLUMN "verification_policy" TEXT;

UPDATE "supply_batch" AS sb
SET
  "brand_id" = pm."brand_id",
  "category_id" = pm."category_id",
  "model_name" = pm."model_name",
  "gtin" = pm."gtin",
  "verification_policy" = pm."verification_policy"
FROM "product_model" AS pm
WHERE sb."product_model_id" = pm."id";

ALTER TABLE "supply_batch"
  ALTER COLUMN "brand_id" SET NOT NULL,
  ALTER COLUMN "category_id" SET NOT NULL,
  ALTER COLUMN "model_name" SET NOT NULL,
  ALTER COLUMN "verification_policy" SET NOT NULL;

CREATE INDEX "supply_batch_brand_id_idx" ON "supply_batch"("brand_id");
CREATE INDEX "supply_batch_category_id_idx" ON "supply_batch"("category_id");

ALTER TABLE "supply_batch"
  ADD CONSTRAINT "supply_batch_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brand"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supply_batch"
  ADD CONSTRAINT "supply_batch_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "category"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
