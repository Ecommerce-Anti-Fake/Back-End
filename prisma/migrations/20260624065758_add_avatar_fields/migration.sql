/*
  Warnings:

  - A unique constraint covering the columns `[avatar_media_id]` on the table `shop` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[banner_media_id]` on the table `shop` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[avatar_media_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MediaResourceType" ADD VALUE 'USER_AVATAR';
ALTER TYPE "MediaResourceType" ADD VALUE 'SHOP_AVATAR';
ALTER TYPE "MediaResourceType" ADD VALUE 'SHOP_BANNER';

-- AlterTable
ALTER TABLE "shop" ADD COLUMN     "avatar_media_id" TEXT,
ADD COLUMN     "banner_media_id" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "avatar_media_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "shop_avatar_media_id_key" ON "shop"("avatar_media_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_banner_media_id_key" ON "shop"("banner_media_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_avatar_media_id_key" ON "user"("avatar_media_id");

-- AddForeignKey
ALTER TABLE "shop" ADD CONSTRAINT "shop_avatar_media_id_fkey" FOREIGN KEY ("avatar_media_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop" ADD CONSTRAINT "shop_banner_media_id_fkey" FOREIGN KEY ("banner_media_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_avatar_media_id_fkey" FOREIGN KEY ("avatar_media_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
