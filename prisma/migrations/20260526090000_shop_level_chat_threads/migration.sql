ALTER TABLE "chat_thread" ADD COLUMN "shop_id" TEXT;

UPDATE "chat_thread" AS thread
SET "shop_id" = offer."shop_id"
FROM "offer"
WHERE thread."offer_id" = offer."id";

ALTER TABLE "chat_thread" ALTER COLUMN "shop_id" SET NOT NULL;

ALTER TABLE "chat_thread" DROP CONSTRAINT "chat_thread_offer_id_fkey";
ALTER TABLE "chat_thread" DROP COLUMN "offer_id";

ALTER TABLE "chat_thread"
ADD CONSTRAINT "chat_thread_shop_id_fkey"
FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "chat_thread_buyer_user_id_shop_id_key" ON "chat_thread"("buyer_user_id", "shop_id");
CREATE INDEX "chat_thread_shop_id_idx" ON "chat_thread"("shop_id");
