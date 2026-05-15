ALTER TYPE "MediaResourceType" ADD VALUE 'REVIEW_IMAGE';

CREATE TABLE "review_media" (
  "id" TEXT NOT NULL,
  "review_id" TEXT NOT NULL,
  "media_asset_id" TEXT,
  "file_url" TEXT NOT NULL,
  "mime_type" TEXT,
  "public_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "review_media_media_asset_id_key" ON "review_media"("media_asset_id");
CREATE INDEX "review_media_review_id_idx" ON "review_media"("review_id");
CREATE INDEX "review_media_media_asset_id_idx" ON "review_media"("media_asset_id");

ALTER TABLE "review_media"
  ADD CONSTRAINT "review_media_review_id_fkey"
  FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "review_media"
  ADD CONSTRAINT "review_media_media_asset_id_fkey"
  FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
