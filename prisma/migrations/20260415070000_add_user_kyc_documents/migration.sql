-- CreateEnum
CREATE TYPE "KycDocumentSide" AS ENUM ('FRONT', 'BACK');

-- AlterTable
ALTER TABLE "user_kyc"
ADD COLUMN "full_name" TEXT,
ADD COLUMN "date_of_birth" TIMESTAMP(3),
ADD COLUMN "review_note" TEXT;

-- Backfill required columns for existing rows if any
UPDATE "user_kyc"
SET
  "full_name" = COALESCE("full_name", ''),
  "date_of_birth" = COALESCE("date_of_birth", NOW());

-- Make required
ALTER TABLE "user_kyc"
ALTER COLUMN "full_name" SET NOT NULL,
ALTER COLUMN "date_of_birth" SET NOT NULL;

-- CreateTable
CREATE TABLE "user_kyc_document" (
  "id" TEXT NOT NULL,
  "user_kyc_id" TEXT NOT NULL,
  "media_asset_id" TEXT NOT NULL,
  "side" "KycDocumentSide" NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_kyc_document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_kyc_document_user_kyc_id_side_key" ON "user_kyc_document"("user_kyc_id", "side");
CREATE UNIQUE INDEX "user_kyc_document_media_asset_id_key" ON "user_kyc_document"("media_asset_id");
CREATE INDEX "user_kyc_document_user_kyc_id_idx" ON "user_kyc_document"("user_kyc_id");

-- AddForeignKey
ALTER TABLE "user_kyc_document"
ADD CONSTRAINT "user_kyc_document_user_kyc_id_fkey"
FOREIGN KEY ("user_kyc_id") REFERENCES "user_kyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_kyc_document"
ADD CONSTRAINT "user_kyc_document_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
