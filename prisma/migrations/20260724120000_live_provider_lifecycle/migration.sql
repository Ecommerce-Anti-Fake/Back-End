ALTER TABLE "live_commerce_session"
  ADD COLUMN "provider_status" TEXT,
  ADD COLUMN "actual_started_at" TIMESTAMP(3),
  ADD COLUMN "actual_ended_at" TIMESTAMP(3);

CREATE INDEX "live_commerce_session_stream_provider_session_id_idx"
  ON "live_commerce_session"("stream_provider_session_id");
