ALTER TABLE "offer"
ADD COLUMN "moderation_status" TEXT NOT NULL DEFAULT 'pending';

UPDATE "offer"
SET "moderation_status" = 'approved';
