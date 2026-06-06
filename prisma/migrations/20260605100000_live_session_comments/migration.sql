CREATE TABLE "live_session_comment" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "SocialPostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "client_message_id" TEXT,
    "hidden_at" TIMESTAMP(3),
    "hidden_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_session_comment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_session_comment_session_id_author_user_id_client_message_id_key" ON "live_session_comment"("session_id", "author_user_id", "client_message_id");
CREATE INDEX "live_session_comment_session_id_created_at_idx" ON "live_session_comment"("session_id", "created_at");
CREATE INDEX "live_session_comment_session_id_visibility_created_at_idx" ON "live_session_comment"("session_id", "visibility", "created_at");
CREATE INDEX "live_session_comment_author_user_id_created_at_idx" ON "live_session_comment"("author_user_id", "created_at");

ALTER TABLE "live_session_comment" ADD CONSTRAINT "live_session_comment_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_commerce_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "live_session_comment" ADD CONSTRAINT "live_session_comment_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "live_session_comment" ADD CONSTRAINT "live_session_comment_hidden_by_user_id_fkey" FOREIGN KEY ("hidden_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
