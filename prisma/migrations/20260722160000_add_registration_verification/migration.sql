ALTER TABLE "user"
ADD COLUMN "email_verified_at" TIMESTAMP(3),
ADD COLUMN "phone_verified_at" TIMESTAMP(3);

-- Normalize legacy identifiers before enforcing the new one-user-per-identity contract.
-- The migration intentionally fails on an existing normalized collision so it can be
-- resolved explicitly instead of silently merging two accounts.
UPDATE "user"
SET "email" = LOWER(BTRIM("email"))
WHERE "email" IS NOT NULL;

UPDATE "user"
SET "phone" = CASE
  WHEN BTRIM("phone") ~ '^\+84[0-9]{9}$' THEN '0' || SUBSTRING(BTRIM("phone") FROM 4)
  ELSE BTRIM("phone")
END
WHERE "phone" IS NOT NULL;

CREATE UNIQUE INDEX "user_email_normalized_key"
ON "user"(LOWER("email"))
WHERE "email" IS NOT NULL;

UPDATE "user"
SET
  "email_verified_at" = CASE WHEN "email" IS NOT NULL THEN "created_at" ELSE NULL END,
  "phone_verified_at" = CASE WHEN "phone" IS NOT NULL THEN "created_at" ELSE NULL END
WHERE "account_status" = 'active';

CREATE TABLE "auth_identity" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_subject" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_identity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registration_session" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "pending_provider_subject" TEXT,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registration_session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registration_challenge" (
  "id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "state_token_hash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "registration_challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_link_intent" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_subject" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_link_intent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_identity_provider_provider_subject_key" ON "auth_identity"("provider", "provider_subject");
CREATE UNIQUE INDEX "auth_identity_user_id_provider_key" ON "auth_identity"("user_id", "provider");
CREATE INDEX "auth_identity_user_id_idx" ON "auth_identity"("user_id");
CREATE INDEX "registration_session_user_id_completed_at_revoked_at_idx" ON "registration_session"("user_id", "completed_at", "revoked_at");
CREATE INDEX "registration_session_expires_at_idx" ON "registration_session"("expires_at");
CREATE INDEX "registration_challenge_session_id_status_idx" ON "registration_challenge"("session_id", "status");
CREATE INDEX "registration_challenge_expires_at_idx" ON "registration_challenge"("expires_at");
CREATE INDEX "auth_link_intent_user_id_used_at_idx" ON "auth_link_intent"("user_id", "used_at");
CREATE INDEX "auth_link_intent_expires_at_idx" ON "auth_link_intent"("expires_at");

ALTER TABLE "auth_identity" ADD CONSTRAINT "auth_identity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_session" ADD CONSTRAINT "registration_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_challenge" ADD CONSTRAINT "registration_challenge_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "registration_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_link_intent" ADD CONSTRAINT "auth_link_intent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
