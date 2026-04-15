/*
  Warnings:

  - The values [AGENT] on the enum `ShopRegistrationType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `base_amount` to the `order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buyer_payable_amount` to the `order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seller_receivable_amount` to the `order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShopRegistrationType_new" AS ENUM ('NORMAL', 'HANDMADE', 'MANUFACTURER', 'DISTRIBUTOR');
ALTER TABLE "shop" ALTER COLUMN "registration_type" TYPE "ShopRegistrationType_new" USING ("registration_type"::text::"ShopRegistrationType_new");
ALTER TYPE "ShopRegistrationType" RENAME TO "ShopRegistrationType_old";
ALTER TYPE "ShopRegistrationType_new" RENAME TO "ShopRegistrationType";
DROP TYPE "public"."ShopRegistrationType_old";
COMMIT;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "base_amount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "buyer_payable_amount" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platform_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "seller_receivable_amount" DECIMAL(18,2) NOT NULL;

-- CreateTable
CREATE TABLE "shop_business_category" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "registration_status" TEXT NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_business_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_category_document" (
    "id" TEXT NOT NULL,
    "shop_business_category_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_number" TEXT,
    "issued_by" TEXT,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_category_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_business_category_shop_id_idx" ON "shop_business_category"("shop_id");

-- CreateIndex
CREATE INDEX "shop_business_category_category_id_idx" ON "shop_business_category"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_business_category_shop_id_category_id_key" ON "shop_business_category"("shop_id", "category_id");

-- CreateIndex
CREATE INDEX "shop_category_document_shop_business_category_id_idx" ON "shop_category_document"("shop_business_category_id");

-- AddForeignKey
ALTER TABLE "shop_business_category" ADD CONSTRAINT "shop_business_category_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_business_category" ADD CONSTRAINT "shop_business_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_category_document" ADD CONSTRAINT "shop_category_document_shop_business_category_id_fkey" FOREIGN KEY ("shop_business_category_id") REFERENCES "shop_business_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
