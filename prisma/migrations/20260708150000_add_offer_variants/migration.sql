CREATE TABLE "offer_variant" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "sku" TEXT,
    "price" DECIMAL(18,2),
    "available_quantity" INTEGER NOT NULL,
    "media_asset_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "combination_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "offer_variant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "offer_variant_value" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "option_value_id" TEXT NOT NULL,
    CONSTRAINT "offer_variant_value_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offer_variant_offer_id_sku_key" ON "offer_variant"("offer_id", "sku");
CREATE UNIQUE INDEX "offer_variant_offer_id_combination_key_key" ON "offer_variant"("offer_id", "combination_key");
CREATE INDEX "offer_variant_offer_id_is_active_created_at_idx" ON "offer_variant"("offer_id", "is_active", "created_at");
CREATE INDEX "offer_variant_media_asset_id_idx" ON "offer_variant"("media_asset_id");
CREATE UNIQUE INDEX "offer_variant_value_variant_id_option_value_id_key" ON "offer_variant_value"("variant_id", "option_value_id");
CREATE INDEX "offer_variant_value_option_value_id_idx" ON "offer_variant_value"("option_value_id");

ALTER TABLE "offer_variant" ADD CONSTRAINT "offer_variant_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offer_variant" ADD CONSTRAINT "offer_variant_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "offer_variant_value" ADD CONSTRAINT "offer_variant_value_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "offer_variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offer_variant_value" ADD CONSTRAINT "offer_variant_value_option_value_id_fkey" FOREIGN KEY ("option_value_id") REFERENCES "offer_option_value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
