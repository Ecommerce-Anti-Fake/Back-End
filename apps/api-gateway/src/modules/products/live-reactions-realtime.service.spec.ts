import { LiveReactionsRealtimeService } from './live-reactions-realtime.service';

describe('LiveReactionsRealtimeService', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const productsRpcService = {
    listLiveSessions: jest.fn(),
    createLiveComment: jest.fn(),
  };
  const liveReactionService = {
    getAggregate: jest.fn(),
    recordReaction: jest.fn(),
  };
  const presenceService = {
    addLiveViewer: jest.fn(),
    refreshLiveViewer: jest.fn(),
  };
  const service = new LiveReactionsRealtimeService(
    jwtService as never,
    productsRpcService as never,
    liveReactionService as never,
    presenceService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('joins only visible live session topics', async () => {
    const join = jest.fn();
    const emit = jest.fn();
    const ack = jest.fn();
    productsRpcService.listLiveSessions.mockResolvedValue([{ id: 'live-1', status: 'LIVE' }]);
    liveReactionService.getAggregate.mockResolvedValue({ liveSessionId: 'live-1', total: 0, totals: {} });

    await service.joinLiveSession(
      { id: 'socket-1', join, emit, data: {} } as never,
      { userId: 'user-1', role: 'user' },
      { liveSessionId: 'live-1' },
      ack,
    );

    expect(join).toHaveBeenCalledWith('live:session:live-1');
    expect(presenceService.addLiveViewer).toHaveBeenCalledWith({
      liveSessionId: 'live-1',
      userId: 'user-1',
      sessionId: 'socket-1',
    });
    expect(ack).toHaveBeenCalledWith({ ok: true, aggregate: { liveSessionId: 'live-1', total: 0, totals: {} } });
  });

  it('rejects unavailable live session topics', async () => {
    const ack = jest.fn();
    productsRpcService.listLiveSessions.mockResolvedValue([{ id: 'other-live', status: 'LIVE' }]);

    await service.joinLiveSession(
      { id: 'socket-1', join: jest.fn(), emit: jest.fn(), data: {} } as never,
      { userId: 'user-1', role: 'user' },
      { liveSessionId: 'live-1' },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Live session is not available' });
  });

  it('broadcasts only public live reaction payloads', async () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (service as never as { io: { to: typeof to } }).io = { to };
    liveReactionService.recordReaction.mockResolvedValue({
      accepted: true,
      aggregate: { liveSessionId: 'live-1', total: 1, totals: { LIKE: 1 } },
    });
    const ack = jest.fn();

    await service.sendReaction(
      { data: { joinedLiveSessions: new Set(['live-1']) } } as never,
      { userId: 'private-user-id-123', role: 'user' },
      { liveSessionId: 'live-1', reactionType: 'LIKE' },
      ack,
    );

    expect(emit).toHaveBeenCalledWith(
      'live:reaction.created',
      expect.objectContaining({
        liveSessionId: 'live-1',
        reactionType: 'LIKE',
        aggregate: { liveSessionId: 'live-1', total: 1, totals: { LIKE: 1 } },
        actor: { userId: 'private-...' },
      }),
    );
    expect(JSON.stringify(emit.mock.calls[0][1])).not.toContain('private-user-id-123');
    expect(ack).toHaveBeenCalledWith({ ok: true, aggregate: { liveSessionId: 'live-1', total: 1, totals: { LIKE: 1 } } });
  });

  it('persists live comments before broadcasting', async () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (service as never as { io: { to: typeof to } }).io = { to };
    productsRpcService.createLiveComment.mockResolvedValue({
      id: 'comment-1',
      sessionId: 'live-1',
      body: 'Xin gia',
      clientMessageId: 'client-1',
    });
    const ack = jest.fn();

    await service.sendComment(
      { data: { joinedLiveSessions: new Set(['live-1']) } } as never,
      { userId: 'user-1', role: 'user' },
      { liveSessionId: 'live-1', body: ' Xin gia ', clientMessageId: 'client-1' },
      ack,
    );

    expect(productsRpcService.createLiveComment).toHaveBeenCalledWith({
      sessionId: 'live-1',
      requesterUserId: 'user-1',
      requesterRole: 'user',
      body: 'Xin gia',
      clientMessageId: 'client-1',
    });
    expect(emit).toHaveBeenCalledWith(
      'live:comment.created',
      expect.objectContaining({
        liveSessionId: 'live-1',
        clientMessageId: 'client-1',
        comment: expect.objectContaining({ id: 'comment-1' }),
      }),
    );
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      clientMessageId: 'client-1',
      comment: expect.objectContaining({ id: 'comment-1' }),
    });
    expect(productsRpcService.createLiveComment.mock.invocationCallOrder[0]).toBeLessThan(emit.mock.invocationCallOrder[0]);
  });

  it('requires live join before comment send', async () => {
    const ack = jest.fn();

    await service.sendComment(
      { data: { joinedLiveSessions: new Set<string>() } } as never,
      { userId: 'user-1', role: 'user' },
      { liveSessionId: 'live-1', body: 'Xin gia' },
      ack,
    );

    expect(productsRpcService.createLiveComment).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Join the live session before sending comments' });
  });
});
