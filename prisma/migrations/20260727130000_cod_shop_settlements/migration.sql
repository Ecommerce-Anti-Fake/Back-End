CREATE TYPE "CodShopSettlementStatus" AS ENUM (
    'PENDING',
    'OUTSTANDING',
    'SETTLED',
    'REVERSED'
);

CREATE TABLE "cod_shop_settlement" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_shop_group_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "platform_fee_amount" DECIMAL(18,2) NOT NULL,
    "affiliate_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "obligation_amount" DECIMAL(18,2) NOT NULL,
    "settled_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "CodShopSettlementStatus" NOT NULL DEFAULT 'PENDING',
    "due_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cod_shop_settlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cod_shop_settlement_order_shop_group_id_key"
    ON "cod_shop_settlement"("order_shop_group_id");
CREATE INDEX "cod_shop_settlement_shop_id_status_due_at_idx"
    ON "cod_shop_settlement"("shop_id", "status", "due_at");
CREATE INDEX "cod_shop_settlement_wallet_id_status_created_at_idx"
    ON "cod_shop_settlement"("wallet_id", "status", "created_at");
CREATE INDEX "cod_shop_settlement_order_id_idx"
    ON "cod_shop_settlement"("order_id");

ALTER TABLE "cod_shop_settlement"
    ADD CONSTRAINT "cod_shop_settlement_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cod_shop_settlement"
    ADD CONSTRAINT "cod_shop_settlement_order_shop_group_id_fkey"
    FOREIGN KEY ("order_shop_group_id") REFERENCES "order_shop_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cod_shop_settlement"
    ADD CONSTRAINT "cod_shop_settlement_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cod_shop_settlement"
    ADD CONSTRAINT "cod_shop_settlement_wallet_id_fkey"
    FOREIGN KEY ("wallet_id") REFERENCES "wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
