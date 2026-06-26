import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSocialCommentUseCase } from './create-social-comment.use-case';
import {
  RemoveSocialReactionUseCase,
  SetSocialReactionUseCase,
} from './set-social-reaction.use-case';
import { ShareSocialPostUseCase } from './share-social-post.use-case';
import { UpdateSocialPostVisibilityUseCase } from './update-social-post-visibility.use-case';

describe('social post interaction use cases in SocialModule', () => {
  const repository = {
    findSocialPostById: jest.fn(),
    findSocialCommentById: jest.fn(),
    createSocialComment: jest.fn(),
    setSocialReaction: jest.fn(),
    removeSocialReaction: jest.fn(),
    shareSocialPost: jest.fn(),
    updateSocialPostVisibility: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findSocialPostById.mockResolvedValue(socialPost());
    repository.findSocialCommentById.mockResolvedValue({
      id: 'comment-1',
      postId: 'post-1',
      parentCommentId: null,
      visibility: 'PUBLIC',
    });
    repository.createSocialComment.mockResolvedValue(
      socialPost({ commentCount: 1 }),
    );
    repository.setSocialReaction.mockResolvedValue(
      socialPost({ liked: true, reactionCount: 1 }),
    );
    repository.removeSocialReaction.mockResolvedValue(socialPost());
    repository.shareSocialPost.mockResolvedValue(socialPost({ shareCount: 1 }));
    repository.updateSocialPostVisibility.mockResolvedValue(
      socialPost({ visibility: 'HIDDEN' }),
    );
  });

  it('adds a comment to a public post', async () => {
    const useCase = new CreateSocialCommentUseCase(repository as never);

    const result = await useCase.execute({
      postId: 'post-1',
      requesterUserId: 'user-2',
      body: ' Dong y ',
    });

    expect(repository.createSocialComment).toHaveBeenCalledWith({
      postId: 'post-1',
      parentCommentId: null,
      authorUserId: 'user-2',
      body: 'Dong y',
    });
    expect(result.stats.comments).toBe(1);
  });

  it('adds a first-level reply to a public root comment on the same post', async () => {
    const useCase = new CreateSocialCommentUseCase(repository as never);

    await useCase.execute({
      postId: 'post-1',
      parentCommentId: 'comment-1',
      requesterUserId: 'user-2',
      body: ' Dong y ',
    });

    expect(repository.createSocialComment).toHaveBeenCalledWith({
      postId: 'post-1',
      parentCommentId: 'comment-1',
      authorUserId: 'user-2',
      body: 'Dong y',
    });
  });

  it('rejects replies to missing or hidden comments', async () => {
    repository.findSocialCommentById.mockResolvedValue(null);
    const useCase = new CreateSocialCommentUseCase(repository as never);

    await expect(
      useCase.execute({
        postId: 'post-1',
        parentCommentId: 'missing-comment',
        requesterUserId: 'user-2',
        body: 'Dong y',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects cross-post and nested replies', async () => {
    const useCase = new CreateSocialCommentUseCase(repository as never);
    repository.findSocialCommentById.mockResolvedValueOnce({
      id: 'comment-1',
      postId: 'other-post',
      parentCommentId: null,
      visibility: 'PUBLIC',
    });

    await expect(
      useCase.execute({
        postId: 'post-1',
        parentCommentId: 'comment-1',
        requesterUserId: 'user-2',
        body: 'Dong y',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.findSocialCommentById.mockResolvedValueOnce({
      id: 'comment-1',
      postId: 'post-1',
      parentCommentId: 'root-comment',
      visibility: 'PUBLIC',
    });

    await expect(
      useCase.execute({
        postId: 'post-1',
        parentCommentId: 'comment-1',
        requesterUserId: 'user-2',
        body: 'Dong y',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sets and removes a like reaction idempotently through repository upsert/delete', async () => {
    const setUseCase = new SetSocialReactionUseCase(repository as never);
    const removeUseCase = new RemoveSocialReactionUseCase(repository as never);

    const liked = await setUseCase.execute({
      postId: 'post-1',
      requesterUserId: 'user-2',
    });
    const unliked = await removeUseCase.execute({
      postId: 'post-1',
      requesterUserId: 'user-2',
    });

    expect(repository.setSocialReaction).toHaveBeenCalledWith({
      postId: 'post-1',
      userId: 'user-2',
      reactionType: 'LIKE',
    });
    expect(repository.removeSocialReaction).toHaveBeenCalledWith({
      postId: 'post-1',
      userId: 'user-2',
      reactionType: 'LIKE',
    });
    expect(liked.viewer.liked).toBe(true);
    expect(unliked.viewer.liked).toBe(false);
  });

  it('records one share per user', async () => {
    const useCase = new ShareSocialPostUseCase(repository as never);

    const result = await useCase.execute({
      postId: 'post-1',
      requesterUserId: 'user-2',
    });

    expect(repository.shareSocialPost).toHaveBeenCalledWith({
      postId: 'post-1',
      userId: 'user-2',
    });
    expect(result.stats.shares).toBe(1);
  });

  it('allows author to hide their post', async () => {
    const useCase = new UpdateSocialPostVisibilityUseCase(repository as never);

    const result = await useCase.execute({
      postId: 'post-1',
      requesterUserId: 'user-1',
      visibility: 'HIDDEN',
    });

    expect(repository.updateSocialPostVisibility).toHaveBeenCalledWith({
      postId: 'post-1',
      requesterUserId: 'user-1',
      visibility: 'HIDDEN',
    });
    expect(result.id).toBe('post-1');
  });

  it('blocks non-authors from hiding posts unless admin', async () => {
    const useCase = new UpdateSocialPostVisibilityUseCase(repository as never);

    await expect(
      useCase.execute({
        postId: 'post-1',
        requesterUserId: 'user-2',
        visibility: 'HIDDEN',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found for hidden posts when commenting', async () => {
    repository.findSocialPostById.mockResolvedValue(
      socialPost({ visibility: 'HIDDEN' }),
    );
    const useCase = new CreateSocialCommentUseCase(repository as never);

    await expect(
      useCase.execute({
        postId: 'post-1',
        requesterUserId: 'user-2',
        body: 'Dong y',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function socialPost(
  input: {
    visibility?: string;
    liked?: boolean;
    reactionCount?: number;
    commentCount?: number;
    shareCount?: number;
  } = {},
) {
  return {
    id: 'post-1',
    authorUserId: 'user-1',
    authorShopId: null,
    offerId: null,
    postType: 'SHARE',
    body: 'Welcome to community',
    visibility: input.visibility ?? 'PUBLIC',
    createdAt: new Date('2026-05-31T01:00:00.000Z'),
    author: { displayName: 'User A', email: null, phone: null },
    authorShop: null,
    comments: [],
    reactions: input.liked ? [{ userId: 'user-2', reactionType: 'LIKE' }] : [],
    _count: {
      comments: input.commentCount ?? 0,
      reactions: input.reactionCount ?? 0,
      shares: input.shareCount ?? 0,
    },
  };
}
