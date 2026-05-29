ALTER TABLE "offer"
  ADD COLUMN "brand_id" TEXT,
  ADD COLUMN "model_name" TEXT,
  ADD COLUMN "gtin" TEXT,
  ADD COLUMN "verification_policy" TEXT;

UPDATE "offer" AS o
SET
  "brand_id" = pm."brand_id",
  "model_name" = pm."model_name",
  "gtin" = pm."gtin",
  "verification_policy" = pm."verification_policy"
FROM "product_model" AS pm
WHERE o."product_model_id" = pm."id";

ALTER TABLE "offer"
  ALTER COLUMN "brand_id" SET NOT NULL,
  ALTER COLUMN "model_name" SET NOT NULL,
  ALTER COLUMN "verification_policy" SET NOT NULL;

CREATE INDEX "offer_brand_id_idx" ON "offer"("brand_id");

ALTER TABLE "offer"
  ADD CONSTRAINT "offer_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brand"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
