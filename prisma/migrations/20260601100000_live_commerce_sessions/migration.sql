CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

CREATE TABLE "live_commerce_session" (
  "id" TEXT NOT NULL,
  "shop_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "cover_url" TEXT,
  "start_at" TIMESTAMP(3) NOT NULL,
  "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "playback_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "live_commerce_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_session_offer" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "live_session_offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "live_session_reminder" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "live_session_reminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "live_commerce_session_shop_id_start_at_idx" ON "live_commerce_session"("shop_id", "start_at");
CREATE INDEX "live_commerce_session_status_start_at_idx" ON "live_commerce_session"("status", "start_at");
CREATE UNIQUE INDEX "live_session_offer_session_id_offer_id_key" ON "live_session_offer"("session_id", "offer_id");
CREATE INDEX "live_session_offer_offer_id_idx" ON "live_session_offer"("offer_id");
CREATE UNIQUE INDEX "live_session_reminder_session_id_user_id_key" ON "live_session_reminder"("session_id", "user_id");
CREATE INDEX "live_session_reminder_user_id_created_at_idx" ON "live_session_reminder"("user_id", "created_at");

ALTER TABLE "live_commerce_session"
  ADD CONSTRAINT "live_commerce_session_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "live_session_offer"
  ADD CONSTRAINT "live_session_offer_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "live_commerce_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "live_session_offer"
  ADD CONSTRAINT "live_session_offer_offer_id_fkey"
  FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "live_session_reminder"
  ADD CONSTRAINT "live_session_reminder_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "live_commerce_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "live_session_reminder"
  ADD CONSTRAINT "live_session_reminder_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
