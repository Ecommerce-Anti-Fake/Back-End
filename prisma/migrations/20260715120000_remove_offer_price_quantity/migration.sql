-- Offer pricing and stock are owned by OfferVariant.
ALTER TABLE "offer"
  DROP COLUMN "price",
  DROP COLUMN "available_quantity";
