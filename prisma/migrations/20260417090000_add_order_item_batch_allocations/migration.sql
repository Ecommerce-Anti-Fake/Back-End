CREATE TABLE "order_item_batch_allocation" (
  "id" TEXT NOT NULL,
  "order_item_id" TEXT NOT NULL,
  "batch_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_item_batch_allocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_item_batch_allocation_batch_id_idx"
ON "order_item_batch_allocation"("batch_id");

ALTER TABLE "order_item_batch_allocation"
ADD CONSTRAINT "order_item_batch_allocation_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_item_batch_allocation"
ADD CONSTRAINT "order_item_batch_allocation_batch_id_fkey"
FOREIGN KEY ("batch_id") REFERENCES "supply_batch"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
