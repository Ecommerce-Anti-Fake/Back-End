type SocialUserRecord = {
  displayName: string | null;
  email: string | null;
  phone: string | null;
};

type SocialCommentWithAuthor = {
  id: string;
  postId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: Date;
  author: SocialUserRecord;
};

type SocialPostWithRelations = {
  id: string;
  authorUserId: string;
  authorShopId: string | null;
  offerId: string | null;
  postType: string;
  body: string;
  visibility: string;
  createdAt: Date;
  author: SocialUserRecord;
  authorShop?: { shopName: string } | null;
  comments?: SocialCommentWithAuthor[];
  reactions?: Array<{ userId: string; reactionType: string }>;
  _count?: { comments?: number; reactions?: number; shares?: number };
};

export function toSocialPostResponse(
  post: SocialPostWithRelations,
  viewerUserId?: string | null,
) {
  return {
    id: post.id,
    authorUserId: post.authorUserId,
    authorShopId: post.authorShopId,
    authorName: displayName(post.author),
    authorShopName: post.authorShop?.shopName ?? null,
    offerId: post.offerId,
    postType: post.postType,
    body: post.body,
    visibility: post.visibility,
    reactionCount: post._count?.reactions ?? post.reactions?.length ?? 0,
    commentCount: post._count?.comments ?? post.comments?.length ?? 0,
    shareCount: post._count?.shares ?? 0,
    viewerHasLiked: Boolean(
      viewerUserId &&
      post.reactions?.some(
        (reaction) =>
          reaction.userId === viewerUserId && reaction.reactionType === 'LIKE',
      ),
    ),
    comments: (post.comments ?? []).map(toSocialCommentResponse),
    createdAt: post.createdAt,
  };
}

export function toSocialCommentResponse(comment: SocialCommentWithAuthor) {
  return {
    id: comment.id,
    postId: comment.postId,
    authorUserId: comment.authorUserId,
    authorName: displayName(comment.author),
    body: comment.body,
    visibility: comment.visibility,
    createdAt: comment.createdAt,
  };
}

function displayName(user: SocialUserRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung ACF';
}
