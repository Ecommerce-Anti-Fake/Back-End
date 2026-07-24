ALTER TABLE "live_commerce_session"
  ADD COLUMN "provider_event_at" TIMESTAMP(3),
  ADD COLUMN "provider_event_type" TEXT,
  ADD COLUMN "provider_error_code" TEXT,
  ADD COLUMN "provider_error_message" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "live_commerce_session"
    WHERE "stream_provider_session_id" IS NOT NULL
    GROUP BY "stream_provider_session_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate live stream provider session IDs must be resolved before migration';
  END IF;
END;
$$;

DROP INDEX IF EXISTS "live_commerce_session_stream_provider_session_id_idx";

CREATE UNIQUE INDEX "live_commerce_session_stream_provider_session_id_key"
  ON "live_commerce_session"("stream_provider_session_id");
