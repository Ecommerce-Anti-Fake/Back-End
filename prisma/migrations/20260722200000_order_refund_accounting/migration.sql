ALTER TABLE "order_item"
ADD COLUMN "shop_product_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "system_product_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "platform_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;

CREATE TABLE "order_refund" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "refund_type" TEXT NOT NULL,
  "refund_status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "total_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "items_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_refund_shop_group" (
  "id" TEXT NOT NULL,
  "refund_id" TEXT NOT NULL,
  "order_shop_group_id" TEXT NOT NULL,
  "base_reduction_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "discount_reduction_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "buyer_refund_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "platform_fee_reduction_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "seller_reduction_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_refund_shop_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_refund_order_id_idempotency_key_key"
ON "order_refund"("order_id", "idempotency_key");
CREATE INDEX "order_refund_order_id_refund_status_idx"
ON "order_refund"("order_id", "refund_status");
CREATE UNIQUE INDEX "order_refund_shop_group_refund_id_order_shop_group_id_key"
ON "order_refund_shop_group"("refund_id", "order_shop_group_id");
CREATE INDEX "order_refund_shop_group_order_shop_group_id_idx"
ON "order_refund_shop_group"("order_shop_group_id");

ALTER TABLE "order_refund"
ADD CONSTRAINT "order_refund_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_refund_shop_group"
ADD CONSTRAINT "order_refund_shop_group_refund_id_fkey"
FOREIGN KEY ("refund_id") REFERENCES "order_refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_refund_shop_group"
ADD CONSTRAINT "order_refund_shop_group_order_shop_group_id_fkey"
FOREIGN KEY ("order_shop_group_id") REFERENCES "order_shop_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
