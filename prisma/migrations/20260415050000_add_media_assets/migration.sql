-- CreateEnum
CREATE TYPE "MediaProvider" AS ENUM ('CLOUDINARY');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('IMAGE', 'VIDEO', 'RAW');

-- CreateEnum
CREATE TYPE "MediaResourceType" AS ENUM (
  'DISPUTE_EVIDENCE',
  'KYC_DOCUMENT',
  'SHOP_DOCUMENT',
  'PRODUCT_IMAGE',
  'OFFER_DOCUMENT',
  'BATCH_DOCUMENT'
);

-- CreateTable
CREATE TABLE "media_asset" (
  "id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "provider" "MediaProvider" NOT NULL,
  "asset_type" "MediaAssetType" NOT NULL,
  "resource_type" "MediaResourceType" NOT NULL,
  "public_id" TEXT,
  "secure_url" TEXT NOT NULL,
  "mime_type" TEXT,
  "folder" TEXT,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "dispute_evidence" ADD COLUMN "media_asset_id" TEXT;

-- CreateIndex
CREATE INDEX "media_asset_owner_user_id_idx" ON "media_asset"("owner_user_id");

-- CreateIndex
CREATE INDEX "media_asset_resource_type_idx" ON "media_asset"("resource_type");

-- CreateIndex
CREATE INDEX "dispute_evidence_media_asset_id_idx" ON "dispute_evidence"("media_asset_id");

-- AddForeignKey
ALTER TABLE "media_asset"
ADD CONSTRAINT "media_asset_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence"
ADD CONSTRAINT "dispute_evidence_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
