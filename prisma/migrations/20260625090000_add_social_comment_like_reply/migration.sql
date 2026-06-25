-- CreateTable
CREATE TABLE "social_comment_like" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_comment_like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_comment_reply" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "SocialPostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_comment_reply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_comment_like_user_id_created_at_idx" ON "social_comment_like"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_comment_like_comment_id_user_id_key" ON "social_comment_like"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "social_comment_reply_comment_id_created_at_idx" ON "social_comment_reply"("comment_id", "created_at");

-- CreateIndex
CREATE INDEX "social_comment_reply_author_user_id_created_at_idx" ON "social_comment_reply"("author_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "social_comment_like" ADD CONSTRAINT "social_comment_like_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "social_comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comment_like" ADD CONSTRAINT "social_comment_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comment_reply" ADD CONSTRAINT "social_comment_reply_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "social_comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comment_reply" ADD CONSTRAINT "social_comment_reply_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
