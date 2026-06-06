import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateLiveCommentUseCase } from './create-live-comment.use-case';
import { ListLiveCommentsUseCase } from './list-live-comments.use-case';
import { UpdateLiveCommentVisibilityUseCase } from './update-live-comment-visibility.use-case';

describe('live comment use cases', () => {
  const repository = {
    findLiveSessionById: jest.fn(),
    listLiveComments: jest.fn(),
    createLiveComment: jest.fn(),
    updateLiveCommentVisibility: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findLiveSessionById.mockResolvedValue(liveSession());
    repository.listLiveComments.mockResolvedValue([liveComment()]);
    repository.createLiveComment.mockResolvedValue(liveComment({ body: 'Xin gia' }));
    repository.updateLiveCommentVisibility.mockResolvedValue(liveComment({ visibility: 'HIDDEN' }));
  });

  it('lists public comments for reconnect history', async () => {
    const useCase = new ListLiveCommentsUseCase(repository as never);

    const result = await useCase.execute({ sessionId: 'live-1', pageSize: 20 });

    expect(repository.listLiveComments).toHaveBeenCalledWith({
      sessionId: 'live-1',
      cursor: null,
      since: null,
      pageSize: 20,
      includeHidden: false,
    });
    expect(result[0].id).toBe('comment-1');
  });

  it('creates comments only while session is live and forwards idempotency key', async () => {
    const useCase = new CreateLiveCommentUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      requesterUserId: 'user-1',
      body: ' Xin gia ',
      clientMessageId: 'client-1',
    });

    expect(repository.createLiveComment).toHaveBeenCalledWith({
      sessionId: 'live-1',
      authorUserId: 'user-1',
      body: 'Xin gia',
      clientMessageId: 'client-1',
    });
    expect(result.body).toBe('Xin gia');
  });

  it('rejects comments after live session ends', async () => {
    repository.findLiveSessionById.mockResolvedValue(liveSession({ status: 'ENDED' }));
    const useCase = new CreateLiveCommentUseCase(repository as never);

    await expect(
      useCase.execute({ sessionId: 'live-1', requesterUserId: 'user-1', body: 'Xin gia' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows admin to hide comments', async () => {
    const useCase = new UpdateLiveCommentVisibilityUseCase(repository as never);

    const result = await useCase.execute({
      sessionId: 'live-1',
      commentId: 'comment-1',
      requesterUserId: 'admin-1',
      requesterRole: 'admin',
      visibility: 'HIDDEN',
    });

    expect(repository.updateLiveCommentVisibility).toHaveBeenCalledWith({
      sessionId: 'live-1',
      commentId: 'comment-1',
      requesterUserId: 'admin-1',
      requesterRole: 'admin',
      visibility: 'HIDDEN',
    });
    expect(result.visibility).toBe('HIDDEN');
  });

  it('blocks non-admin moderation', async () => {
    const useCase = new UpdateLiveCommentVisibilityUseCase(repository as never);

    await expect(
      useCase.execute({
        sessionId: 'live-1',
        commentId: 'comment-1',
        requesterUserId: 'user-1',
        requesterRole: 'user',
        visibility: 'HIDDEN',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function liveSession(input: { status?: string } = {}) {
  return {
    id: 'live-1',
    status: input.status ?? 'LIVE',
  };
}

function liveComment(input: { body?: string; visibility?: string } = {}) {
  return {
    id: 'comment-1',
    sessionId: 'live-1',
    authorUserId: 'user-1',
    body: input.body ?? 'Xin gia',
    visibility: input.visibility ?? 'PUBLIC',
    clientMessageId: 'client-1',
    createdAt: new Date('2026-06-05T03:00:00.000Z'),
    updatedAt: new Date('2026-06-05T03:00:00.000Z'),
    author: { displayName: 'Buyer A', email: null, phone: null },
  };
}
