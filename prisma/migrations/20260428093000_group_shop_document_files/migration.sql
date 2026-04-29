-- CreateTable
CREATE TABLE "shop_document_file" (
    "id" TEXT NOT NULL,
    "shop_document_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_document_file_pkey" PRIMARY KEY ("id")
);

-- Migrate existing one-file shop documents into the new file table.
INSERT INTO "shop_document_file" (
    "id",
    "shop_document_id",
    "media_asset_id",
    "file_url",
    "sort_order",
    "uploaded_at"
)
SELECT
    CONCAT("id", '-file-1'),
    "id",
    "media_asset_id",
    "file_url",
    0,
    "uploaded_at"
FROM "shop_document"
WHERE "media_asset_id" IS NOT NULL;

-- Drop old one-file relation from shop_document.
ALTER TABLE "shop_document" DROP CONSTRAINT IF EXISTS "shop_document_media_asset_id_fkey";
DROP INDEX IF EXISTS "shop_document_media_asset_id_key";
ALTER TABLE "shop_document" DROP COLUMN "media_asset_id";
ALTER TABLE "shop_document" DROP COLUMN "file_url";

-- CreateIndex
CREATE UNIQUE INDEX "shop_document_file_media_asset_id_key" ON "shop_document_file"("media_asset_id");
CREATE INDEX "shop_document_file_shop_document_id_idx" ON "shop_document_file"("shop_document_id");
CREATE INDEX "shop_document_shop_id_idx" ON "shop_document"("shop_id");
CREATE INDEX "shop_document_doc_type_idx" ON "shop_document"("doc_type");

-- AddForeignKey
ALTER TABLE "shop_document_file"
ADD CONSTRAINT "shop_document_file_shop_document_id_fkey"
FOREIGN KEY ("shop_document_id") REFERENCES "shop_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shop_document_file"
ADD CONSTRAINT "shop_document_file_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
