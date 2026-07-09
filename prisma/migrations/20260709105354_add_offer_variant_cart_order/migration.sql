-- DropForeignKey
ALTER TABLE "chat_thread" DROP CONSTRAINT "chat_thread_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "social_comment" DROP CONSTRAINT "social_comment_parent_comment_id_fkey";

-- DropIndex
DROP INDEX "cart_item_cart_id_offer_id_key";

-- DropIndex
DROP INDEX "offer_option_group_offer_id_sort_order_created_at_idx";

-- DropIndex
DROP INDEX "offer_option_group_offer_id_name_key";

-- DropIndex
DROP INDEX "offer_variant_offer_id_combination_key_key";

-- AlterTable
ALTER TABLE "cart_item" ADD COLUMN     "variant_id" TEXT;

-- AlterTable
ALTER TABLE "offer_option_group" DROP COLUMN "name",
DROP COLUMN "sort_order";

-- AlterTable
ALTER TABLE "offer_option_value" ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "offer_variant" DROP COLUMN "combination_key";

-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "variant_id" TEXT;

-- CreateTable
CREATE TABLE "order_item_option_value" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "option_group_id" TEXT,
    "option_value_id" TEXT,
    "option_group_name" TEXT NOT NULL,
    "option_group_display_name" TEXT NOT NULL,
    "option_value_text" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "media_url" TEXT,

    CONSTRAINT "order_item_option_value_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_item_option_value_order_item_id_idx" ON "order_item_option_value"("order_item_id");

-- CreateIndex
CREATE INDEX "cart_item_variant_id_idx" ON "cart_item"("variant_id");

-- CreateIndex
CREATE INDEX "offer_option_group_offer_id_created_at_idx" ON "offer_option_group"("offer_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "offer_option_group_offer_id_display_name_key" ON "offer_option_group"("offer_id", "display_name");

-- CreateIndex
CREATE INDEX "order_item_variant_id_idx" ON "order_item"("variant_id");

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "offer_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_option_value" ADD CONSTRAINT "order_item_option_value_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "offer_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "social_comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
