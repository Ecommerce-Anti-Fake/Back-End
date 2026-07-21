CREATE TYPE "VoucherOwnerType" AS ENUM ('SYSTEM', 'SHOP');
CREATE TYPE "VoucherDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');
CREATE TYPE "VoucherStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');
CREATE TYPE "VoucherRedemptionStatus" AS ENUM ('RESERVED', 'USED', 'RELEASED');

CREATE TABLE "voucher" (
  "id" TEXT NOT NULL,
  "owner_type" "VoucherOwnerType" NOT NULL,
  "shop_id" TEXT,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "discount_type" "VoucherDiscountType" NOT NULL,
  "percentage" DECIMAL(5,2),
  "fixed_amount" DECIMAL(18,2),
  "max_discount_amount" DECIMAL(18,2),
  "min_order_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "scope_type" TEXT NOT NULL DEFAULT 'ALL',
  "scope_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "total_usage_limit" INTEGER,
  "user_usage_limit" INTEGER,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "status" "VoucherStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "voucher_redemption" (
  "id" TEXT NOT NULL,
  "voucher_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "order_id" TEXT,
  "status" "VoucherRedemptionStatus" NOT NULL DEFAULT 'RESERVED',
  "idempotency_key" TEXT NOT NULL,
  "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_at" TIMESTAMP(3),
  CONSTRAINT "voucher_redemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_voucher_allocation" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "order_shop_group_id" TEXT NOT NULL,
  "voucher_id" TEXT NOT NULL,
  "product_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "shipping_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "eligible_base_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "funding_source" "VoucherOwnerType" NOT NULL,
  CONSTRAINT "order_voucher_allocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "voucher_owner_type_shop_id_code_key" ON "voucher"("owner_type", "shop_id", "code");
CREATE INDEX "voucher_owner_type_status_starts_at_ends_at_idx" ON "voucher"("owner_type", "status", "starts_at", "ends_at");
CREATE INDEX "voucher_shop_id_status_idx" ON "voucher"("shop_id", "status");
CREATE UNIQUE INDEX "voucher_redemption_idempotency_key_key" ON "voucher_redemption"("idempotency_key");
CREATE UNIQUE INDEX "voucher_redemption_voucher_id_user_id_order_id_key" ON "voucher_redemption"("voucher_id", "user_id", "order_id");
CREATE INDEX "voucher_redemption_voucher_id_status_idx" ON "voucher_redemption"("voucher_id", "status");
CREATE INDEX "voucher_redemption_user_id_status_idx" ON "voucher_redemption"("user_id", "status");
CREATE UNIQUE INDEX "order_voucher_allocation_order_id_order_shop_group_id_voucher_id_key" ON "order_voucher_allocation"("order_id", "order_shop_group_id", "voucher_id");
CREATE INDEX "order_voucher_allocation_voucher_id_idx" ON "order_voucher_allocation"("voucher_id");

ALTER TABLE "voucher" ADD CONSTRAINT "voucher_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "voucher_redemption" ADD CONSTRAINT "voucher_redemption_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "voucher_redemption" ADD CONSTRAINT "voucher_redemption_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "voucher_redemption" ADD CONSTRAINT "voucher_redemption_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_voucher_allocation" ADD CONSTRAINT "order_voucher_allocation_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_voucher_allocation" ADD CONSTRAINT "order_voucher_allocation_order_shop_group_id_fkey" FOREIGN KEY ("order_shop_group_id") REFERENCES "order_shop_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_voucher_allocation" ADD CONSTRAINT "order_voucher_allocation_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
