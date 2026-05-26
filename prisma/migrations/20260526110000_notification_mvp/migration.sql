CREATE TABLE "notification" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "notification_type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "dedupe_key" TEXT NOT NULL,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification"
ADD CONSTRAINT "notification_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notification_dedupe_key_key" ON "notification"("dedupe_key");
CREATE INDEX "notification_user_id_read_at_created_at_idx" ON "notification"("user_id", "read_at", "created_at");
CREATE INDEX "notification_target_type_target_id_idx" ON "notification"("target_type", "target_id");
