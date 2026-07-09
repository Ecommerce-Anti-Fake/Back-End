/*
  Warnings:

  - You are about to drop the column `option_group_name` on the `order_item_option_value` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order_item_option_value" DROP COLUMN "option_group_name";
