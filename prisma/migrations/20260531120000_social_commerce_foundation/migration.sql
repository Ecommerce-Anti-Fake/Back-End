-- CreateEnum
CREATE TYPE "SocialPostType" AS ENUM ('SHARE', 'QUESTION', 'PRODUCT_SHARE');

-- CreateEnum
CREATE TYPE "SocialPostVisibility" AS ENUM ('PUBLIC', 'HIDDEN');

-- CreateEnum
CREATE TYPE "SocialReactionType" AS ENUM ('LIKE');

-- CreateTable
CREATE TABLE "social_post" (
    "id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "author_shop_id" TEXT,
    "offer_id" TEXT,
    "post_type" "SocialPostType" NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "SocialPostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "hidden_at" TIMESTAMP(3),
    "hidden_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_comment" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "SocialPostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_reaction" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reaction_type" "SocialReactionType" NOT NULL DEFAULT 'LIKE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_share" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_post_author_user_id_created_at_idx" ON "social_post"("author_user_id", "created_at");

-- CreateIndex
CREATE INDEX "social_post_author_shop_id_created_at_idx" ON "social_post"("author_shop_id", "created_at");

-- CreateIndex
CREATE INDEX "social_post_offer_id_idx" ON "social_post"("offer_id");

-- CreateIndex
CREATE INDEX "social_post_visibility_created_at_idx" ON "social_post"("visibility", "created_at");

-- CreateIndex
CREATE INDEX "social_comment_post_id_created_at_idx" ON "social_comment"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "social_comment_author_user_id_created_at_idx" ON "social_comment"("author_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_reaction_post_id_user_id_reaction_type_key" ON "social_reaction"("post_id", "user_id", "reaction_type");

-- CreateIndex
CREATE INDEX "social_reaction_user_id_created_at_idx" ON "social_reaction"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "social_share_post_id_user_id_key" ON "social_share"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "social_share_user_id_created_at_idx" ON "social_share"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "social_post" ADD CONSTRAINT "social_post_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post" ADD CONSTRAINT "social_post_author_shop_id_fkey" FOREIGN KEY ("author_shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post" ADD CONSTRAINT "social_post_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_comment" ADD CONSTRAINT "social_comment_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reaction" ADD CONSTRAINT "social_reaction_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_reaction" ADD CONSTRAINT "social_reaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_share" ADD CONSTRAINT "social_share_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_share" ADD CONSTRAINT "social_share_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
