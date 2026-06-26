import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';

@Injectable()
export class SocialRepository {
  constructor(private readonly prisma: PrismaService) {}

  listSocialPosts(input: {
    requesterUserId?: string | null;
    includeHidden?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
    return this.prisma.socialPost.findMany({
      where: input.includeHidden ? {} : { visibility: 'PUBLIC' },
      include: this.socialPostInclude(input.requesterUserId),
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  countSocialPostsSince(input: {
    authorUserId: string;
    authorShopId?: string | null;
    since: Date;
  }) {
    return this.prisma.socialPost.count({
      where: {
        authorUserId: input.authorUserId,
        authorShopId: input.authorShopId ?? null,
        createdAt: { gte: input.since },
      },
    });
  }

  findShopForSocialPost(shopId: string) {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, ownerUserId: true, shopName: true, shopStatus: true },
    });
  }

  findOfferForSocialPost(offerId: string) {
    return this.prisma.offer.findUnique({
      where: { id: offerId },
      select: { id: true, offerStatus: true },
    });
  }

  createSocialPost(input: {
    authorUserId: string;
    authorShopId?: string | null;
    offerId?: string | null;
    postType: 'SHARE' | 'QUESTION' | 'PRODUCT_SHARE';
    body: string;
  }) {
    return this.prisma.socialPost.create({
      data: {
        authorUserId: input.authorUserId,
        authorShopId: input.authorShopId ?? null,
        offerId: input.offerId ?? null,
        postType: input.postType,
        body: input.body,
      },
      include: this.socialPostInclude(input.authorUserId),
    });
  }

  findSocialPostById(postId: string, requesterUserId?: string | null) {
    return this.prisma.socialPost.findUnique({
      where: { id: postId },
      include: this.socialPostInclude(requesterUserId),
    });
  }

  listSocialComments(input: {
    postId: string;
    requesterUserId?: string | null;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));
    return this.prisma.socialComment.findMany({
      where: {
        postId: input.postId,
        parentCommentId: null,
        visibility: 'PUBLIC',
      },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            avatarMedia: { select: { secureUrl: true } },
          },
        },
        likes: input.requesterUserId
          ? {
              where: { userId: input.requesterUserId },
              select: { userId: true },
            }
          : { take: 0, select: { userId: true } },
        _count: { select: { likes: true, replies: true } },
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  countSocialComments(postId: string) {
    return this.prisma.socialComment.count({
      where: { postId, parentCommentId: null, visibility: 'PUBLIC' },
    });
  }

  findSocialCommentById(commentId: string, requesterUserId?: string | null) {
    return this.prisma.socialComment.findUnique({
      where: { id: commentId },
      include: {
        post: { include: this.socialPostInclude(requesterUserId) },
      },
    });
  }

  async listSocialCommentReplies(input: {
    commentId: string;
    requesterUserId?: string | null;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 5));
    const descendantRows = await this.prisma.$queryRaw<
      Array<{ id: string; depth: number }>
    >`
      WITH RECURSIVE comment_tree AS (
        SELECT c.id, c.created_at, 1 AS depth
        FROM social_comment c
        WHERE c.parent_comment_id = ${input.commentId}
          AND c.visibility = 'PUBLIC'

        UNION ALL

        SELECT child.id, child.created_at, comment_tree.depth + 1 AS depth
        FROM social_comment child
        INNER JOIN comment_tree ON child.parent_comment_id = comment_tree.id
        WHERE child.visibility = 'PUBLIC'
      )
      SELECT id, depth
      FROM comment_tree
      ORDER BY depth ASC, created_at ASC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `;
    if (descendantRows.length === 0) {
      return [];
    }

    const replies = await this.prisma.socialComment.findMany({
      where: { id: { in: descendantRows.map((row) => row.id) } },
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            avatarMedia: { select: { secureUrl: true } },
          },
        },
        parentComment: {
          select: {
            authorUserId: true,
            author: {
              select: {
                id: true,
                displayName: true,
                email: true,
                phone: true,
                avatarMedia: { select: { secureUrl: true } },
              },
            },
          },
        },
        likes: input.requesterUserId
          ? {
              where: { userId: input.requesterUserId },
              select: { userId: true },
            }
          : { take: 0, select: { userId: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
    const repliesById = new Map(replies.map((reply) => [reply.id, reply]));
    return descendantRows.flatMap((row) => {
      const reply = repliesById.get(row.id);
      return reply ? [{ ...reply, depth: Number(row.depth) }] : [];
    });
  }

  async countSocialCommentReplies(commentId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      WITH RECURSIVE comment_tree AS (
        SELECT c.id
        FROM social_comment c
        WHERE c.parent_comment_id = ${commentId}
          AND c.visibility = 'PUBLIC'

        UNION ALL

        SELECT child.id
        FROM social_comment child
        INNER JOIN comment_tree ON child.parent_comment_id = comment_tree.id
        WHERE child.visibility = 'PUBLIC'
      )
      SELECT COUNT(*) AS count
      FROM comment_tree
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async createSocialComment(input: {
    postId: string;
    authorUserId: string;
    body: string;
  }) {
    await this.prisma.socialComment.create({
      data: { ...input, parentCommentId: null },
    });
    return this.findSocialPostById(input.postId, input.authorUserId);
  }

  async createSocialCommentReply(input: {
    postId: string;
    parentCommentId: string;
    authorUserId: string;
    body: string;
  }) {
    const reply = await this.prisma.socialComment.create({
      data: input,
      include: this.socialCommentReplyInclude(input.authorUserId),
    });
    const rows = await this.prisma.$queryRaw<Array<{ depth: bigint }>>`
      WITH RECURSIVE ancestor_tree AS (
        SELECT id, parent_comment_id, 0 AS depth
        FROM social_comment
        WHERE id = ${reply.id}

        UNION ALL

        SELECT parent.id, parent.parent_comment_id, ancestor_tree.depth + 1
        FROM social_comment parent
        INNER JOIN ancestor_tree ON ancestor_tree.parent_comment_id = parent.id
      )
      SELECT MAX(depth) AS depth
      FROM ancestor_tree
    `;
    return { ...reply, depth: Number(rows[0]?.depth ?? 0) };
  }

  async setSocialReaction(input: {
    postId: string;
    userId: string;
    reactionType?: 'LIKE';
  }) {
    await this.prisma.socialReaction.upsert({
      where: {
        postId_userId_reactionType: {
          postId: input.postId,
          userId: input.userId,
          reactionType: input.reactionType ?? 'LIKE',
        },
      },
      create: {
        postId: input.postId,
        userId: input.userId,
        reactionType: input.reactionType ?? 'LIKE',
      },
      update: {},
    });
    return this.findSocialPostById(input.postId, input.userId);
  }

  async removeSocialReaction(input: {
    postId: string;
    userId: string;
    reactionType?: 'LIKE';
  }) {
    await this.prisma.socialReaction.deleteMany({
      where: {
        postId: input.postId,
        userId: input.userId,
        reactionType: input.reactionType ?? 'LIKE',
      },
    });
    return this.findSocialPostById(input.postId, input.userId);
  }

  async shareSocialPost(input: { postId: string; userId: string }) {
    await this.prisma.socialShare.upsert({
      where: { postId_userId: { postId: input.postId, userId: input.userId } },
      create: input,
      update: {},
    });
    return this.findSocialPostById(input.postId, input.userId);
  }

  updateSocialPostVisibility(input: {
    postId: string;
    requesterUserId: string;
    visibility: 'PUBLIC' | 'HIDDEN';
  }) {
    return this.prisma.socialPost.update({
      where: { id: input.postId },
      data: {
        visibility: input.visibility,
        hiddenAt: input.visibility === 'HIDDEN' ? new Date() : null,
        hiddenByUserId:
          input.visibility === 'HIDDEN' ? input.requesterUserId : null,
      },
      include: this.socialPostInclude(input.requesterUserId),
    });
  }

  private socialPostInclude(requesterUserId?: string | null) {
    return {
      author: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          avatarMedia: { select: { secureUrl: true } },
        },
      },
      authorShop: {
        select: {
          shopName: true,
          avatarMedia: { select: { secureUrl: true } },
        },
      },
      offer: {
        select: {
          media: {
            orderBy: { createdAt: 'asc' as const },
            take: 1,
            select: {
              fileUrl: true,
              mediaAsset: { select: { secureUrl: true } },
            },
          },
        },
      },
      comments: {
        where: { visibility: 'PUBLIC' as const, parentCommentId: null },
        orderBy: { createdAt: 'asc' as const },
        take: 3,
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              avatarMedia: { select: { secureUrl: true } },
            },
          },
        },
      },
      reactions: requesterUserId
        ? {
            where: { userId: requesterUserId, reactionType: 'LIKE' as const },
            select: { userId: true, reactionType: true },
          }
        : { take: 0, select: { userId: true, reactionType: true } },
      _count: {
        select: {
          comments: {
            where: { visibility: 'PUBLIC' as const, parentCommentId: null },
          },
          reactions: true,
          shares: true,
        },
      },
    };
  }

  private socialCommentReplyInclude(requesterUserId?: string | null) {
    return {
      author: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          avatarMedia: { select: { secureUrl: true } },
        },
      },
      parentComment: {
        select: {
          authorUserId: true,
          author: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
              avatarMedia: { select: { secureUrl: true } },
            },
          },
        },
      },
      likes: requesterUserId
        ? {
            where: { userId: requesterUserId },
            select: { userId: true },
          }
        : { take: 0, select: { userId: true } },
      _count: { select: { likes: true, replies: true } },
    };
  }
}
