-- CreateTable
CREATE TABLE "cart" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "cart_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "offer_title_snapshot" TEXT NOT NULL,
    "unit_price_snapshot" DECIMAL(18,2) NOT NULL,
    "currency_snapshot" TEXT NOT NULL,
    "shop_name_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_buyer_user_id_idx" ON "cart"("buyer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_buyer_user_id_cart_status_key" ON "cart"("buyer_user_id", "cart_status");

-- CreateIndex
CREATE INDEX "cart_item_cart_id_idx" ON "cart_item"("cart_id");

-- CreateIndex
CREATE INDEX "cart_item_offer_id_idx" ON "cart_item"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cart_id_offer_id_key" ON "cart_item"("cart_id", "offer_id");

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
