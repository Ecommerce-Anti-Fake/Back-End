ALTER TABLE "chat_thread"
  ALTER COLUMN "shop_id" DROP NOT NULL,
  ADD COLUMN "direct_participant_key" TEXT;

CREATE UNIQUE INDEX "chat_thread_direct_participant_key_key"
  ON "chat_thread"("direct_participant_key");
