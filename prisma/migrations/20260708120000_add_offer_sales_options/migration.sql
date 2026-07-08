CREATE TABLE "offer_option_group" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "offer_option_group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "offer_option_value" (
    "id" TEXT NOT NULL,
    "option_group_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "offer_option_value_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offer_option_group_offer_id_name_key" ON "offer_option_group"("offer_id", "name");
CREATE INDEX "offer_option_group_offer_id_sort_order_created_at_idx" ON "offer_option_group"("offer_id", "sort_order", "created_at");
CREATE UNIQUE INDEX "offer_option_value_option_group_id_text_key" ON "offer_option_value"("option_group_id", "text");
CREATE INDEX "offer_option_value_option_group_id_sort_order_created_at_idx" ON "offer_option_value"("option_group_id", "sort_order", "created_at");
CREATE INDEX "offer_option_value_media_asset_id_idx" ON "offer_option_value"("media_asset_id");

ALTER TABLE "offer_option_group" ADD CONSTRAINT "offer_option_group_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offer_option_value" ADD CONSTRAINT "offer_option_value_option_group_id_fkey" FOREIGN KEY ("option_group_id") REFERENCES "offer_option_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offer_option_value" ADD CONSTRAINT "offer_option_value_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
