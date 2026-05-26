-- CreateTable
CREATE TABLE "user_favorite_offer" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_offer_user_id_offer_id_key" ON "user_favorite_offer"("user_id", "offer_id");

-- CreateIndex
CREATE INDEX "user_favorite_offer_user_id_idx" ON "user_favorite_offer"("user_id");

-- CreateIndex
CREATE INDEX "user_favorite_offer_offer_id_idx" ON "user_favorite_offer"("offer_id");

-- AddForeignKey
ALTER TABLE "user_favorite_offer" ADD CONSTRAINT "user_favorite_offer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_offer" ADD CONSTRAINT "user_favorite_offer_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
