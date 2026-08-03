CREATE TABLE "pending_registration" (
    "id" TEXT NOT NULL,
    "firebase_uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_registration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_registration_firebase_uid_key"
ON "pending_registration"("firebase_uid");

CREATE UNIQUE INDEX "pending_registration_email_key"
ON "pending_registration"("email");

CREATE UNIQUE INDEX "pending_registration_phone_key"
ON "pending_registration"("phone");

CREATE INDEX "pending_registration_expires_at_idx"
ON "pending_registration"("expires_at");
