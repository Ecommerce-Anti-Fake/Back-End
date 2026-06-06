import { ChatRealtimeService } from './chat-realtime.service';

describe('ChatRealtimeService', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const productsRpcService = {
    getChatThread: jest.fn(),
    sendChatMessage: jest.fn(),
  };
  const redisRealtimeConfigService = {
    getConfig: jest.fn().mockReturnValue({ enabled: false, url: null }),
  };
  const presenceService = {
    heartbeat: jest.fn(),
    listOnlineUserIds: jest.fn(),
    markTyping: jest.fn(),
  };
  const liveReactionsRealtimeService = {
    bind: jest.fn(),
  };
  const service = new ChatRealtimeService(
    jwtService as never,
    productsRpcService as never,
    redisRealtimeConfigService as never,
    presenceService as never,
    liveReactionsRealtimeService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('authenticates Socket.IO handshakes with access tokens', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', role: 'user', typ: 'access' });

    const principal = await service.authenticate({
      handshake: { auth: { accessToken: 'token-1' }, query: {} },
    } as never);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('token-1');
    expect(principal).toEqual({ userId: 'user-1', role: 'user' });
  });

  it('does not join rooms when thread authorization fails', async () => {
    productsRpcService.getChatThread.mockRejectedValue(new Error('Only chat participants can view this thread'));
    const join = jest.fn();
    const ack = jest.fn();

    await service.joinThread(
      { join } as never,
      { userId: 'stranger', role: 'user' },
      { threadId: 'thread-1' },
      ack,
    );

    expect(productsRpcService.getChatThread).toHaveBeenCalledWith({
      threadId: 'thread-1',
      requesterUserId: 'stranger',
      requesterRole: 'user',
    });
    expect(join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ ok: false, error: 'Only chat participants can view this thread' });
  });

  it('emits room-scoped presence only after room authorization passes', async () => {
    const join = jest.fn();
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (service as never as { io: { to: typeof to } }).io = { to };
    productsRpcService.getChatThread.mockResolvedValue({
      id: 'thread-1',
      buyerUserId: 'buyer-1',
      sellerUserId: 'seller-1',
    });
    presenceService.listOnlineUserIds.mockResolvedValue(['buyer-1']);
    const socket = {
      join,
      data: {},
    };

    await service.joinThread(socket as never, { userId: 'buyer-1', role: 'user' }, { threadId: 'thread-1' }, jest.fn());

    expect(join).toHaveBeenCalledWith('chat:thread:thread-1');
    expect(to).toHaveBeenCalledWith('chat:thread:thread-1');
    expect(emit).toHaveBeenCalledWith('presence:update', {
      threadId: 'thread-1',
      onlineUserIds: ['buyer-1'],
    });
  });

  it('rejects typing events before authorized room join', async () => {
    const emit = jest.fn();

    await service.markTyping(
      { data: {}, emit } as never,
      { userId: 'buyer-1', role: 'user' },
      { threadId: 'thread-1', isTyping: true },
    );

    expect(presenceService.markTyping).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('chat:error', { error: 'Join the chat thread before sending typing events' });
  });

  it('persists messages before broadcasting to the room', async () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (service as never as { io: { to: typeof to } }).io = { to };
    const ack = jest.fn();
    const thread = {
      id: 'thread-1',
      messages: [{ id: 'message-1', clientMessageId: 'client-1' }],
    };
    productsRpcService.sendChatMessage.mockResolvedValue(thread);

    await service.sendMessage(
      {} as never,
      { userId: 'buyer-1', role: 'user' },
      { threadId: 'thread-1', body: 'Xin chao', clientMessageId: 'client-1' },
      ack,
    );

    expect(productsRpcService.sendChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      requesterUserId: 'buyer-1',
      requesterRole: 'user',
      body: 'Xin chao',
      clientMessageId: 'client-1',
      messageType: 'TEXT',
    });
    expect(to).toHaveBeenCalledWith('chat:thread:thread-1');
    expect(emit).toHaveBeenCalledWith(
      'chat:message.created',
      expect.objectContaining({
        eventName: 'chat.message.created.v1',
        threadId: 'thread-1',
        thread,
        clientMessageId: 'client-1',
      }),
    );
    expect(productsRpcService.sendChatMessage.mock.invocationCallOrder[0]).toBeLessThan(emit.mock.invocationCallOrder[0]);
    expect(ack).toHaveBeenCalledWith({ ok: true, thread, clientMessageId: 'client-1' });
  });
});
