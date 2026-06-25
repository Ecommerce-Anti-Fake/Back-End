type SocialUserRecord = {
  id?: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  avatarMedia?: { secureUrl: string } | null;
};

type SocialCommentWithAuthor = {
  id: string;
  postId: string;
  authorUserId: string;
  body: string;
  visibility: string;
  createdAt: Date;
  author: SocialUserRecord;
  likes?: Array<{ userId: string }>;
  _count?: { likes?: number; replies?: number };
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
  authorShop?: {
    shopName: string;
    avatarMedia?: { secureUrl: string } | null;
  } | null;
  offer?: {
    media?: Array<{
      fileUrl: string;
      mediaAsset?: { secureUrl: string } | null;
    }>;
  } | null;
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
    author: {
      id: post.authorUserId,
      name: displayName(post.author),
      avatar:
        post.authorShop?.avatarMedia?.secureUrl ??
        post.author.avatarMedia?.secureUrl ??
        null,
      shopName: post.authorShop?.shopName ?? null,
    },
    postType: post.postType,
    body: post.body,
    image: firstOfferImage(post),
    createdAt: post.createdAt,
    stats: {
      reactions: post._count?.reactions ?? post.reactions?.length ?? 0,
      comments: post._count?.comments ?? post.comments?.length ?? 0,
      shares: post._count?.shares ?? 0,
    },
    viewer: {
      liked: Boolean(
        viewerUserId &&
          post.reactions?.some(
            (reaction) =>
              reaction.userId === viewerUserId &&
              reaction.reactionType === 'LIKE',
          ),
      ),
    },
  };
}

export function toSocialCommentResponse(comment: SocialCommentWithAuthor) {
  return {
    id: comment.id,
    author: {
      id: comment.authorUserId,
      name: displayName(comment.author),
      avatar: comment.author.avatarMedia?.secureUrl ?? null,
    },
    body: comment.body,
    createdAt: comment.createdAt,
    likeCount: comment._count?.likes ?? comment.likes?.length ?? 0,
    viewerLiked: Boolean(comment.likes?.length),
    replyCount: comment._count?.replies ?? 0,
  };
}

function displayName(user: SocialUserRecord) {
  return user.displayName || user.email || user.phone || 'Nguoi dung ACF';
}

function firstOfferImage(post: SocialPostWithRelations) {
  const media = post.offer?.media?.[0];
  return media?.mediaAsset?.secureUrl ?? media?.fileUrl ?? null;
}
