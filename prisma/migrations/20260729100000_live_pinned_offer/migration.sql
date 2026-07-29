ALTER TABLE "live_commerce_session"
ADD COLUMN "pinned_offer_id" TEXT;

CREATE INDEX "live_commerce_session_pinned_offer_id_idx"
ON "live_commerce_session"("pinned_offer_id");

ALTER TABLE "live_commerce_session"
ADD CONSTRAINT "live_commerce_session_pinned_offer_id_fkey"
FOREIGN KEY ("pinned_offer_id")
REFERENCES "offer"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
