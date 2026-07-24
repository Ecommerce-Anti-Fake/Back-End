CREATE TABLE "live_session_voucher" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "voucher_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "live_session_voucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_session_voucher_session_id_voucher_id_key"
ON "live_session_voucher"("session_id", "voucher_id");

CREATE INDEX "live_session_voucher_voucher_id_idx"
ON "live_session_voucher"("voucher_id");

ALTER TABLE "live_session_voucher"
ADD CONSTRAINT "live_session_voucher_session_id_fkey"
FOREIGN KEY ("session_id")
REFERENCES "live_commerce_session"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "live_session_voucher"
ADD CONSTRAINT "live_session_voucher_voucher_id_fkey"
FOREIGN KEY ("voucher_id")
REFERENCES "voucher"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
