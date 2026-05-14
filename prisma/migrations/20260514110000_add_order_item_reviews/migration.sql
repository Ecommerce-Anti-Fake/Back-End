ALTER TABLE "review" ADD COLUMN "order_item_id" TEXT;

CREATE UNIQUE INDEX "review_order_item_id_key" ON "review"("order_item_id");
CREATE INDEX "order_item_order_id_idx" ON "order_item"("order_id");
CREATE INDEX "order_item_offer_id_idx" ON "order_item"("offer_id");
CREATE INDEX "review_order_id_idx" ON "review"("order_id");
CREATE INDEX "review_from_user_id_idx" ON "review"("from_user_id");
CREATE INDEX "review_to_user_id_idx" ON "review"("to_user_id");

ALTER TABLE "review"
  ADD CONSTRAINT "review_order_item_id_fkey"
  FOREIGN KEY ("order_item_id")
  REFERENCES "order_item"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
