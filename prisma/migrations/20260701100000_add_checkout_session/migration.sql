CREATE TABLE "checkout_session" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "cart_item_ids" JSONB NOT NULL,
    "shipping_option_code" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "payment_provider_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),

    CONSTRAINT "checkout_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checkout_session_payment_provider_ref_key" ON "checkout_session"("payment_provider_ref");
CREATE INDEX "checkout_session_buyer_user_id_payment_status_idx" ON "checkout_session"("buyer_user_id", "payment_status");
