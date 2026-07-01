CREATE TABLE "order_shop_group" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "shop_id" TEXT NOT NULL,
  "fulfillment_status" TEXT NOT NULL DEFAULT 'PENDING',
  "base_amount" DECIMAL(18,2) NOT NULL,
  "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "platform_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "seller_receivable_amount" DECIMAL(18,2) NOT NULL,
  "shipping_name" TEXT,
  "shipping_phone" TEXT,
  "shipping_address" TEXT,
  "shipping_district_id" INTEGER,
  "shipping_district_name" TEXT,
  "shipping_ward_code" TEXT,
  "shipping_ward_name" TEXT,
  "shipping_provider_code" TEXT,
  "shipping_provider_name" TEXT,
  "shipping_service_id" INTEGER,
  "shipping_service_type_id" INTEGER,
  "shipping_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "shipping_tracking_code" TEXT,
  "parcel_weight_grams" INTEGER,
  "parcel_length_cm" INTEGER,
  "parcel_width_cm" INTEGER,
  "parcel_height_cm" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_shop_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_shop_group_order_id_shop_id_key" ON "order_shop_group"("order_id", "shop_id");
CREATE INDEX "order_shop_group_shop_id_fulfillment_status_idx" ON "order_shop_group"("shop_id", "fulfillment_status");

ALTER TABLE "order_shop_group" ADD CONSTRAINT "order_shop_group_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_shop_group" ADD CONSTRAINT "order_shop_group_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_item" ADD COLUMN "order_shop_group_id" TEXT;
ALTER TABLE "order_item" ADD COLUMN "source_cart_item_id" TEXT;
CREATE INDEX "order_item_order_shop_group_id_idx" ON "order_item"("order_shop_group_id");
CREATE INDEX "order_item_source_cart_item_id_idx" ON "order_item"("source_cart_item_id");
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_shop_group_id_fkey" FOREIGN KEY ("order_shop_group_id") REFERENCES "order_shop_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "order_shop_group" (
  "id", "order_id", "shop_id", "fulfillment_status", "base_amount", "discount_amount",
  "platform_fee_amount", "seller_receivable_amount", "shipping_name", "shipping_phone",
  "shipping_address", "shipping_district_id", "shipping_district_name", "shipping_ward_code",
  "shipping_ward_name", "shipping_provider_code", "shipping_provider_name", "shipping_service_id",
  "shipping_service_type_id", "shipping_fee_amount", "shipping_tracking_code", "parcel_weight_grams",
  "parcel_length_cm", "parcel_width_cm", "parcel_height_cm", "created_at", "updated_at"
)
SELECT
  gen_random_uuid()::text, "id", "shop_id", "fulfillment_status", "base_amount", "discount_amount",
  "platform_fee_amount", "seller_receivable_amount", "shipping_name", "shipping_phone",
  "shipping_address", "shipping_district_id", "shipping_district_name", "shipping_ward_code",
  "shipping_ward_name", "shipping_provider_code", "shipping_provider_name", "shipping_service_id",
  "shipping_service_type_id", "shipping_fee_amount", "shipping_tracking_code", "parcel_weight_grams",
  "parcel_length_cm", "parcel_width_cm", "parcel_height_cm", "created_at", "created_at"
FROM "order";

UPDATE "order_item" oi
SET "order_shop_group_id" = osg."id"
FROM "order_shop_group" osg
WHERE osg."order_id" = oi."order_id";

DROP TABLE "checkout_session";
