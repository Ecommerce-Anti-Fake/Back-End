ALTER TABLE "cart_item"
ADD COLUMN "source_live_session_id" TEXT;

ALTER TABLE "order_item"
ADD COLUMN "source_live_session_id" TEXT;

CREATE INDEX "cart_item_source_live_session_id_idx"
ON "cart_item"("source_live_session_id");

CREATE INDEX "order_item_source_live_session_id_idx"
ON "order_item"("source_live_session_id");

ALTER TABLE "cart_item"
ADD CONSTRAINT "cart_item_source_live_session_id_fkey"
FOREIGN KEY ("source_live_session_id")
REFERENCES "live_commerce_session"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "order_item"
ADD CONSTRAINT "order_item_source_live_session_id_fkey"
FOREIGN KEY ("source_live_session_id")
REFERENCES "live_commerce_session"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
