CREATE TABLE "bank_account_verification" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shop_id" TEXT,
    "bank_bin" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "bank_short_name" TEXT NOT NULL,
    "bank_logo" TEXT,
    "account_number_encrypted" TEXT NOT NULL,
    "account_number_hash" TEXT NOT NULL,
    "account_number_last4" TEXT NOT NULL,
    "account_number_length" INTEGER NOT NULL,
    "account_holder" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_account_verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_account_verification_user_id_expires_at_idx"
    ON "bank_account_verification"("user_id", "expires_at");
CREATE INDEX "bank_account_verification_shop_id_expires_at_idx"
    ON "bank_account_verification"("shop_id", "expires_at");
CREATE INDEX "bank_account_verification_account_number_hash_idx"
    ON "bank_account_verification"("account_number_hash");

ALTER TABLE "bank_account_verification"
    ADD CONSTRAINT "bank_account_verification_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_account_verification"
    ADD CONSTRAINT "bank_account_verification_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
