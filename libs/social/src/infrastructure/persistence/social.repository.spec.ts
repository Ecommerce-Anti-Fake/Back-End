import { SocialRepository } from './social.repository';

describe('SocialRepository comment threading', () => {
  const prisma = {
    $queryRaw: jest.fn(),
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

  it('loads ordered public descendants with one recursive query and preserves parent authors', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { id: 'reply-b', depth: 1 },
        { id: 'reply-c', depth: 2 },
        { id: 'reply-d', depth: 3 },
      ])
      .mockResolvedValueOnce([{ count: BigInt(3) }]);
    prisma.socialComment.findMany.mockResolvedValue([
      { id: 'reply-d' },
      { id: 'reply-b' },
      { id: 'reply-c' },
    ]);

    const replies = await repository.listSocialCommentReplies({
      commentId: 'comment-1',
      requesterUserId: 'viewer-1',
    });
    const total = await repository.countSocialCommentReplies('comment-1');

    expect(replies).toEqual([
      { id: 'reply-b', depth: 1 },
      { id: 'reply-c', depth: 2 },
      { id: 'reply-d', depth: 3 },
    ]);
    expect(total).toBe(3);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.$queryRaw.mock.calls[0][0].join(' ')).toContain(
      'WITH RECURSIVE comment_tree',
    );
    expect(prisma.$queryRaw.mock.calls[0][0].join(' ')).toContain(
      "WHERE child.visibility = 'PUBLIC'",
    );
    expect(prisma.socialComment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['reply-b', 'reply-c', 'reply-d'] } },
        include: expect.objectContaining({
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
          _count: { select: { likes: true, replies: true } },
        }),
      }),
    );
  });

  it('returns descendants below a nested reply with their relative depths', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: 'reply-c', depth: 1 },
      { id: 'reply-d', depth: 2 },
    ]);
    prisma.socialComment.findMany.mockResolvedValue([
      { id: 'reply-d' },
      { id: 'reply-c' },
    ]);

    const replies = await repository.listSocialCommentReplies({
      commentId: 'reply-b',
    });

    expect(replies).toEqual([
      { id: 'reply-c', depth: 1 },
      { id: 'reply-d', depth: 2 },
    ]);
  });
});
