-- CreateEnum
CREATE TYPE "DistributionDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "DistributionPricingScope" AS ENUM ('NETWORK_DEFAULT', 'NODE_LEVEL', 'NODE_SPECIFIC');

-- CreateEnum
CREATE TYPE "OrderMode" AS ENUM ('RETAIL', 'WHOLESALE');

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_buyer_user_id_fkey";

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "buyer_distribution_node_id" TEXT,
ADD COLUMN     "buyer_shop_id" TEXT,
ADD COLUMN     "order_mode" "OrderMode" NOT NULL DEFAULT 'RETAIL',
ALTER COLUMN "buyer_user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "distribution_pricing_policy" (
    "id" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "node_id" TEXT,
    "applies_to_level" INTEGER,
    "product_model_id" TEXT,
    "category_id" TEXT,
    "scope" "DistributionPricingScope" NOT NULL,
    "discount_type" "DistributionDiscountType" NOT NULL,
    "discount_value" DECIMAL(18,2) NOT NULL,
    "min_quantity" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_pricing_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_network_id_is_active_idx" ON "distribution_pricing_policy"("network_id", "is_active");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_node_id_idx" ON "distribution_pricing_policy"("node_id");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_applies_to_level_idx" ON "distribution_pricing_policy"("applies_to_level");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_product_model_id_idx" ON "distribution_pricing_policy"("product_model_id");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_category_id_idx" ON "distribution_pricing_policy"("category_id");

-- CreateIndex
CREATE INDEX "order_buyer_user_id_idx" ON "order"("buyer_user_id");

-- CreateIndex
CREATE INDEX "order_buyer_shop_id_idx" ON "order"("buyer_shop_id");

-- CreateIndex
CREATE INDEX "order_buyer_distribution_node_id_idx" ON "order"("buyer_distribution_node_id");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_shop_id_fkey" FOREIGN KEY ("buyer_shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_distribution_node_id_fkey" FOREIGN KEY ("buyer_distribution_node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "distribution_network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
