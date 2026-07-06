import { RemoveSocialCommentLikeUseCase, SetSocialCommentLikeUseCase } from './set-social-comment-like.use-case';

describe('social comment like use cases', () => {
  const repository = {
    findSocialCommentById: jest.fn(),
    setSocialCommentLike: jest.fn(),
    removeSocialCommentLike: jest.fn(),
    createNotification: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findSocialCommentById.mockResolvedValue(comment());
    repository.setSocialCommentLike.mockResolvedValue(comment(true));
    repository.removeSocialCommentLike.mockResolvedValue(comment(false));
  });

  it('likes a public comment idempotently and notifies its author', async () => {
    const result = await new SetSocialCommentLikeUseCase(repository as never).execute({
      commentId: 'comment-1',
      requesterUserId: 'user-2',
    });

    expect(result.viewerLiked).toBe(true);
    expect(repository.setSocialCommentLike).toHaveBeenCalledWith({ commentId: 'comment-1', userId: 'user-2' });
    expect(repository.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      notificationType: 'SOCIAL_COMMENT_LIKE',
      dedupeKey: 'SOCIAL_COMMENT_LIKE:comment-1:user-2',
    }));
  });

  it('removes the current user like without creating a notification', async () => {
    const result = await new RemoveSocialCommentLikeUseCase(repository as never).execute({
      commentId: 'comment-1',
      requesterUserId: 'user-2',
    });

    expect(result.viewerLiked).toBe(false);
    expect(repository.removeSocialCommentLike).toHaveBeenCalledWith({ commentId: 'comment-1', userId: 'user-2' });
    expect(repository.createNotification).not.toHaveBeenCalled();
  });

  it('does not mutate likes for a hidden comment', async () => {
    repository.findSocialCommentById.mockResolvedValue({ ...comment(), visibility: 'HIDDEN' });

    await expect(new RemoveSocialCommentLikeUseCase(repository as never).execute({
      commentId: 'comment-1',
      requesterUserId: 'user-2',
    })).rejects.toThrow('Social comment not found');

    expect(repository.removeSocialCommentLike).not.toHaveBeenCalled();
  });
});

function comment(liked = false) {
  return {
    id: 'comment-1', postId: 'post-1', parentCommentId: null, authorUserId: 'user-1', body: 'Comment',
    visibility: 'PUBLIC', createdAt: new Date(),
    author: { id: 'user-1', displayName: 'User 1', email: null, phone: null, avatarMedia: null },
    likes: liked ? [{ userId: 'user-2' }] : [], _count: { likes: liked ? 1 : 0, replies: 0 },
  };
}
