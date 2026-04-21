/*
  Warnings:

  - Added the required column `category_id` to the `product_model` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "product_model" ADD COLUMN     "category_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "supply_batch" ALTER COLUMN "quantity" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "product_model_category_id_idx" ON "product_model"("category_id");

-- AddForeignKey
ALTER TABLE "product_model" ADD CONSTRAINT "product_model_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
