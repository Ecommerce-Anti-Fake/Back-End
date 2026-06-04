ALTER TABLE "chat_message" ADD COLUMN "client_message_id" TEXT;

CREATE UNIQUE INDEX "chat_message_thread_id_client_message_id_key"
ON "chat_message"("thread_id", "client_message_id");
