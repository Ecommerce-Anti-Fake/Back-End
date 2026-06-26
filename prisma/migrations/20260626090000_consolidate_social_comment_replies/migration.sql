-- Preserve legacy replies and their likes before removing reply-specific tables.
ALTER TABLE "social_comment" ADD COLUMN "parent_comment_id" TEXT;

INSERT INTO "social_comment" (
    "id", "post_id", "parent_comment_id", "author_user_id", "body", "visibility", "created_at", "updated_at"
)
SELECT
    reply."id",
    parent."post_id",
    reply."comment_id",
    reply."author_user_id",
    reply."body",
    reply."visibility",
    reply."created_at",
    reply."updated_at"
FROM "social_comment_reply" AS reply
JOIN "social_comment" AS parent ON parent."id" = reply."comment_id";

INSERT INTO "social_comment_like" ("id", "comment_id", "user_id", "created_at")
SELECT reply_like."id", reply_like."reply_id", reply_like."user_id", reply_like."created_at"
FROM "social_comment_reply_like" AS reply_like
ON CONFLICT ("comment_id", "user_id") DO NOTHING;

DROP TABLE "social_comment_reply_like";
DROP TABLE "social_comment_reply";

CREATE INDEX "social_comment_parent_comment_id_created_at_idx"
ON "social_comment"("parent_comment_id", "created_at");

ALTER TABLE "social_comment"
ADD CONSTRAINT "social_comment_parent_comment_id_check"
CHECK ("parent_comment_id" IS NULL OR "parent_comment_id" <> "id");

ALTER TABLE "social_comment"
ADD CONSTRAINT "social_comment_parent_comment_id_fkey"
FOREIGN KEY ("parent_comment_id") REFERENCES "social_comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
