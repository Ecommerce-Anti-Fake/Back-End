-- AlterTable
ALTER TABLE "shop_business_category"
ADD COLUMN "review_note" TEXT;

ALTER TABLE "shop_category_document"
ADD COLUMN "media_asset_id" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3);

ALTER TABLE "shop_document"
ADD COLUMN "media_asset_id" TEXT,
ADD COLUMN "review_note" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "shop_category_document_media_asset_id_key" ON "shop_category_document"("media_asset_id");
CREATE UNIQUE INDEX "shop_document_media_asset_id_key" ON "shop_document"("media_asset_id");

-- AddForeignKey
ALTER TABLE "shop_category_document"
ADD CONSTRAINT "shop_category_document_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shop_document"
ADD CONSTRAINT "shop_document_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
