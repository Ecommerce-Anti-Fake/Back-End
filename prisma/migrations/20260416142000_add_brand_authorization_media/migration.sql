ALTER TABLE "brand_authorization"
ADD COLUMN "media_asset_id" UUID,
ADD COLUMN "file_url" TEXT,
ADD COLUMN "review_note" TEXT,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "brand_authorization_media_asset_id_key" ON "brand_authorization"("media_asset_id");
CREATE UNIQUE INDEX "brand_authorization_shop_id_brand_id_key" ON "brand_authorization"("shop_id", "brand_id");
CREATE INDEX "brand_authorization_media_asset_id_idx" ON "brand_authorization"("media_asset_id");

ALTER TABLE "brand_authorization"
ADD CONSTRAINT "brand_authorization_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
