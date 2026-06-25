-- CreateTable
CREATE TABLE "social_comment_reply_like" (
    "id" TEXT NOT NULL,
    "reply_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_comment_reply_like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_comment_reply_like_user_id_created_at_idx" ON "social_comment_reply_like"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_comment_reply_like_reply_id_user_id_key" ON "social_comment_reply_like"("reply_id", "user_id");

-- AddForeignKey
ALTER TABLE "social_comment_reply_like" ADD CONSTRAINT "social_comment_reply_like_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "social_comment_reply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comment_reply_like" ADD CONSTRAINT "social_comment_reply_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
