ALTER TABLE "offer"
  DROP COLUMN "sales_mode",
  DROP COLUMN "min_wholesale_qty";

ALTER TABLE "order"
  DROP COLUMN "order_mode",
  DROP COLUMN "order_type";

DROP TYPE "OfferSalesMode";
DROP TYPE "OrderMode";
