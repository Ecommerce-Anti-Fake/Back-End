-- RT2 notification delivery foundation: browser FCM token storage and non-blocking delivery attempt audit.
CREATE TABLE "notification_fcm_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_id" TEXT,
    "user_agent" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_fcm_token_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_delivery_attempt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_id" TEXT,
    "event_name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_attempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_fcm_token_token_hash_key" ON "notification_fcm_token"("token_hash");
CREATE INDEX "notification_fcm_token_user_id_revoked_at_idx" ON "notification_fcm_token"("user_id", "revoked_at");
CREATE INDEX "notification_delivery_attempt_user_id_created_at_idx" ON "notification_delivery_attempt"("user_id", "created_at");
CREATE INDEX "notification_delivery_attempt_notification_id_idx" ON "notification_delivery_attempt"("notification_id");
CREATE INDEX "notification_delivery_attempt_provider_status_created_at_idx" ON "notification_delivery_attempt"("provider", "status", "created_at");

ALTER TABLE "notification_fcm_token" ADD CONSTRAINT "notification_fcm_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_delivery_attempt" ADD CONSTRAINT "notification_delivery_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_delivery_attempt" ADD CONSTRAINT "notification_delivery_attempt_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;
