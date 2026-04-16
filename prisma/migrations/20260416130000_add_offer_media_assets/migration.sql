ALTER TABLE "offer_media"
ADD COLUMN "media_asset_id" UUID;

ALTER TABLE "offer_document"
ADD COLUMN "media_asset_id" UUID;

CREATE UNIQUE INDEX "offer_media_media_asset_id_key" ON "offer_media"("media_asset_id");
CREATE INDEX "offer_media_media_asset_id_idx" ON "offer_media"("media_asset_id");

CREATE UNIQUE INDEX "offer_document_media_asset_id_key" ON "offer_document"("media_asset_id");
CREATE INDEX "offer_document_media_asset_id_idx" ON "offer_document"("media_asset_id");

ALTER TABLE "offer_media"
ADD CONSTRAINT "offer_media_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "offer_document"
ADD CONSTRAINT "offer_document_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
