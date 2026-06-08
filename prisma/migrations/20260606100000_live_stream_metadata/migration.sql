ALTER TABLE "live_commerce_session"
ADD COLUMN "stream_provider" TEXT,
ADD COLUMN "stream_provider_session_id" TEXT,
ADD COLUMN "stream_ingest_url" TEXT,
ADD COLUMN "stream_latency_target_ms" INTEGER,
ADD COLUMN "recording_url" TEXT,
ADD COLUMN "recording_retention_days" INTEGER;

CREATE INDEX "live_commerce_session_stream_provider_idx" ON "live_commerce_session"("stream_provider");
CREATE INDEX "live_commerce_session_stream_provider_session_id_idx" ON "live_commerce_session"("stream_provider_session_id");
