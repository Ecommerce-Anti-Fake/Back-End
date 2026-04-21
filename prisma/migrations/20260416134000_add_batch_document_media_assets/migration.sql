ALTER TABLE "batch_document"
ADD COLUMN "media_asset_id" TEXT;

CREATE UNIQUE INDEX "batch_document_media_asset_id_key" ON "batch_document"("media_asset_id");
CREATE INDEX "batch_document_media_asset_id_idx" ON "batch_document"("media_asset_id");

ALTER TABLE "batch_document"
ADD CONSTRAINT "batch_document_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
