ALTER TABLE "supply_batch"
  ADD COLUMN "source_order_id" TEXT,
  ADD COLUMN "source_order_item_id" TEXT;

CREATE INDEX "supply_batch_source_order_id_idx" ON "supply_batch"("source_order_id");
CREATE INDEX "supply_batch_source_order_item_id_idx" ON "supply_batch"("source_order_item_id");

ALTER TABLE "supply_batch"
  ADD CONSTRAINT "supply_batch_source_order_id_fkey"
  FOREIGN KEY ("source_order_id") REFERENCES "order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supply_batch"
  ADD CONSTRAINT "supply_batch_source_order_item_id_fkey"
  FOREIGN KEY ("source_order_item_id") REFERENCES "order_item"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
