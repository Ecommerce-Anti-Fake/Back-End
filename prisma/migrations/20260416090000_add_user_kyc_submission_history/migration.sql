CREATE TABLE "user_kyc_submission" (
    "id" TEXT NOT NULL,
    "user_kyc_id" TEXT NOT NULL,
    "submission_number" INTEGER NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_kyc_submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_kyc_submission_document" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "side" "KycDocumentSide" NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_kyc_submission_document_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_kyc_submission_user_kyc_id_submission_number_key" ON "user_kyc_submission"("user_kyc_id", "submission_number");
CREATE INDEX "user_kyc_submission_user_kyc_id_submitted_at_idx" ON "user_kyc_submission"("user_kyc_id", "submitted_at");
CREATE UNIQUE INDEX "user_kyc_submission_document_media_asset_id_key" ON "user_kyc_submission_document"("media_asset_id");
CREATE UNIQUE INDEX "user_kyc_submission_document_submission_id_side_key" ON "user_kyc_submission_document"("submission_id", "side");
CREATE INDEX "user_kyc_submission_document_submission_id_idx" ON "user_kyc_submission_document"("submission_id");

ALTER TABLE "user_kyc_submission" ADD CONSTRAINT "user_kyc_submission_user_kyc_id_fkey"
FOREIGN KEY ("user_kyc_id") REFERENCES "user_kyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_kyc_submission_document" ADD CONSTRAINT "user_kyc_submission_document_submission_id_fkey"
FOREIGN KEY ("submission_id") REFERENCES "user_kyc_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_kyc_submission_document" ADD CONSTRAINT "user_kyc_submission_document_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
