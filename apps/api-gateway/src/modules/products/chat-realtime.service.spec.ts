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
  const service = new ChatRealtimeService(jwtService as never, productsRpcService as never, redisRealtimeConfigService as never);

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
