import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateSocialCommentReplyUseCase } from './create-social-comment-reply.use-case';

describe('CreateSocialCommentReplyUseCase', () => {
  const repository = {
    findSocialCommentById: jest.fn(),
    createSocialCommentReply: jest.fn(),
  };
  const useCase = new CreateSocialCommentReplyUseCase(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findSocialCommentById.mockResolvedValue({
      id: 'comment-a',
      postId: 'post-1',
      visibility: 'PUBLIC',
    });
    repository.createSocialCommentReply.mockResolvedValue(reply());
  });

  it('creates a reply from the public parent comment rather than client-supplied post data', async () => {
    const result = await useCase.execute({
      commentId: 'comment-a',
      requesterUserId: 'user-b',
      body: ' Cam on A ',
    });

    expect(repository.createSocialCommentReply).toHaveBeenCalledWith({
      postId: 'post-1',
      parentCommentId: 'comment-a',
      authorUserId: 'user-b',
      body: 'Cam on A',
    });
    expect(result.replyToUser).toEqual({
      userId: 'user-a',
      userName: 'User A',
    });
  });

  it('rejects replies to missing or hidden parents', async () => {
    repository.findSocialCommentById.mockResolvedValue({
      id: 'comment-a',
      postId: 'post-1',
      visibility: 'HIDDEN',
    });

    await expect(
      useCase.execute({
        commentId: 'comment-a',
        requesterUserId: 'user-b',
        body: 'Cam on A',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an empty reply body after trimming', async () => {
    await expect(
      useCase.execute({
        commentId: 'comment-a',
        requesterUserId: 'user-b',
        body: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function reply() {
  return {
    id: 'reply-b',
    postId: 'post-1',
    parentCommentId: 'comment-a',
    authorUserId: 'user-b',
    body: 'Cam on A',
    visibility: 'PUBLIC',
    createdAt: new Date('2026-06-26T10:00:00.000Z'),
    author: { displayName: 'User B', email: null, phone: null, avatarMedia: null },
    parentComment: {
      authorUserId: 'user-a',
      author: { displayName: 'User A', email: null, phone: null, avatarMedia: null },
    },
    likes: [],
    _count: { likes: 0, replies: 0 },
    depth: 1,
  };
}
