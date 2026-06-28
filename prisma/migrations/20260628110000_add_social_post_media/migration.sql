ALTER TYPE "MediaResourceType" ADD VALUE IF NOT EXISTS 'SOCIAL_POST';

CREATE TABLE "social_post_media" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_post_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_post_media_post_id_media_asset_id_key" ON "social_post_media"("post_id", "media_asset_id");
CREATE INDEX "social_post_media_post_id_sort_order_idx" ON "social_post_media"("post_id", "sort_order");
CREATE INDEX "social_post_media_media_asset_id_idx" ON "social_post_media"("media_asset_id");

ALTER TABLE "social_post_media" ADD CONSTRAINT "social_post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_post_media" ADD CONSTRAINT "social_post_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
