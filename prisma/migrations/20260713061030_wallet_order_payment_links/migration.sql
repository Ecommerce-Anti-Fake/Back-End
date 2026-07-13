-- AlterTable
ALTER TABLE "wallet_transaction" ADD COLUMN     "order_id" TEXT,
ADD COLUMN     "payment_intent_id" TEXT;

-- CreateIndex
CREATE INDEX "wallet_transaction_order_id_idx" ON "wallet_transaction"("order_id");

-- CreateIndex
CREATE INDEX "wallet_transaction_payment_intent_id_idx" ON "wallet_transaction"("payment_intent_id");

-- AddForeignKey
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transaction" ADD CONSTRAINT "wallet_transaction_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
