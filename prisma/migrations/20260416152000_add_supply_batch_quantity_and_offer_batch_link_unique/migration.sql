ALTER TABLE "supply_batch"
ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "offer_batch_link"
ADD CONSTRAINT "offer_batch_link_offer_id_batch_id_key" UNIQUE ("offer_id", "batch_id");
