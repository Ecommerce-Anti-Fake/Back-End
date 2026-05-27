CREATE TABLE "shipping_carrier" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shipping_carrier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "offer_shipping_method" (
  "id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "carrier_id" TEXT NOT NULL,
  "provider_code" TEXT NOT NULL,
  "provider_name" TEXT NOT NULL,
  "shipping_fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "estimated_days" TEXT,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offer_shipping_method_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order"
ADD COLUMN "shipping_provider_code" TEXT,
ADD COLUMN "shipping_provider_name" TEXT,
ADD COLUMN "shipping_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "shipping_tracking_code" TEXT;

CREATE UNIQUE INDEX "shipping_carrier_code_key" ON "shipping_carrier"("code");
CREATE INDEX "shipping_carrier_is_active_sort_order_idx" ON "shipping_carrier"("is_active", "sort_order");
CREATE UNIQUE INDEX "offer_shipping_method_offer_id_provider_code_key" ON "offer_shipping_method"("offer_id", "provider_code");
CREATE INDEX "offer_shipping_method_carrier_id_idx" ON "offer_shipping_method"("carrier_id");

INSERT INTO "shipping_carrier" ("id", "code", "name", "description", "is_active", "sort_order", "updated_at")
VALUES
  ('carrier-self-delivery', 'SELF_DELIVERY', 'Tu van chuyen', 'Seller tu giao hoac tu sap xep van chuyen.', true, 0, CURRENT_TIMESTAMP),
  ('carrier-ghn', 'GHN', 'Giao Hang Nhanh', 'Carrier tich hop du kien qua API GHN.', true, 10, CURRENT_TIMESTAMP),
  ('carrier-ghtk', 'GHTK', 'Giao Hang Tiet Kiem', 'Carrier tich hop du kien qua API GHTK.', true, 20, CURRENT_TIMESTAMP),
  ('carrier-viettel-post', 'VIETTEL_POST', 'Viettel Post', 'Carrier tich hop du kien qua API Viettel Post.', true, 30, CURRENT_TIMESTAMP),
  ('carrier-jnt', 'JNT', 'J&T Express', 'Carrier tich hop du kien qua API J&T Express.', true, 40, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "offer_shipping_method" ("id", "offer_id", "carrier_id", "provider_code", "provider_name", "shipping_fee", "is_enabled")
SELECT CONCAT('offer-shipping-self-', o."id"), o."id", 'carrier-self-delivery', 'SELF_DELIVERY', 'Tu van chuyen', 0, true
FROM "offer" o
ON CONFLICT ("offer_id", "provider_code") DO NOTHING;

ALTER TABLE "offer_shipping_method"
ADD CONSTRAINT "offer_shipping_method_offer_id_fkey"
FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "offer_shipping_method"
ADD CONSTRAINT "offer_shipping_method_carrier_id_fkey"
FOREIGN KEY ("carrier_id") REFERENCES "shipping_carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
