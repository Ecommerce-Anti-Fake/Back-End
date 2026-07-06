ALTER TABLE "chat_message" ALTER COLUMN "body" DROP NOT NULL;

CREATE TABLE "chat_message_attachment" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,

    CONSTRAINT "chat_message_attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_message_attachment_message_id_idx" ON "chat_message_attachment"("message_id");

ALTER TABLE "chat_message_attachment" ADD CONSTRAINT "chat_message_attachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
