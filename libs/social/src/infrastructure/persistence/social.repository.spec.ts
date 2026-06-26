import { SocialRepository } from './social.repository';

describe('SocialRepository comment threading', () => {
  const prisma = {
    socialComment: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    socialPost: { findUnique: jest.fn() },
  };
  const repository = new SocialRepository(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists and counts only root comments', async () => {
    await repository.listSocialComments({ postId: 'post-1' });
    await repository.countSocialComments('post-1');

    expect(prisma.socialComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          postId: 'post-1',
          parentCommentId: null,
          visibility: 'PUBLIC',
        },
      }),
    );
    expect(prisma.socialComment.count).toHaveBeenCalledWith({
      where: { postId: 'post-1', parentCommentId: null, visibility: 'PUBLIC' },
    });
  });

  it('uses SocialComment and SocialCommentLike for replies', async () => {
    await repository.listSocialCommentReplies({
      commentId: 'comment-1',
      requesterUserId: 'viewer-1',
    });
    await repository.countSocialCommentReplies('comment-1');

    expect(prisma.socialComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentCommentId: 'comment-1', visibility: 'PUBLIC' },
        include: expect.objectContaining({
          _count: { select: { likes: true } },
        }),
      }),
    );
    expect(prisma.socialComment.count).toHaveBeenCalledWith({
      where: { parentCommentId: 'comment-1', visibility: 'PUBLIC' },
    });
  });
});
