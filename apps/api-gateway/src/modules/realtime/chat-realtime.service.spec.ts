import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import { ChatRealtimeService } from './chat-realtime.service';

jest.mock('socket.io', () => ({
  Server: jest.fn(),
}));

describe('ChatRealtimeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the explicit HTTP CORS allowlist for Socket.IO', async () => {
    const io = {
      adapter: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };
    jest.mocked(Server).mockImplementation(() => io as never);
    const redisRealtimeConfigService = {
      getConfig: jest.fn().mockReturnValue({
        enabled: false,
        mode: 'disabled',
        url: null,
        keyPrefix: 'acf',
        defaultTtlSeconds: 300,
        connectionName: 'acf-realtime',
      }),
    };
    const liveReactionsRealtimeService = {
      bind: jest.fn(),
    };
    const service = new ChatRealtimeService(
      {} as never,
      {} as never,
      redisRealtimeConfigService as never,
      {} as never,
      liveReactionsRealtimeService as never,
      new ConfigService({
        NODE_ENV: 'production',
        CORS_ALLOWED_ORIGINS: 'https://staging.antifake.io.vn',
      }),
    );

    await service.bind({});

    const options = jest.mocked(Server).mock.calls[0][1];
    expect(options?.cors?.credentials).toBe(true);
    expect(options?.cors?.origin).toEqual(
      expect.arrayContaining([
        'https://antifake.io.vn',
        'https://www.antifake.io.vn',
        'https://api.antifake.io.vn',
        'https://staging.antifake.io.vn',
      ]),
    );
    expect(options?.cors?.origin).not.toBe(true);
    expect(options?.cors?.origin).not.toEqual(
      expect.arrayContaining([
        'https://legacy-frontend.example',
        'https://legacy-backend.example',
      ]),
    );
  });

  it('broadcasts the created message in chat message events', async () => {
    const createdMessage = {
      id: 'message-1',
      threadId: 'thread-1',
      senderUserId: 'user-1',
      clientMessageId: 'client-1',
      messageType: 'TEXT',
      body: 'Xin chao shop',
      attachments: [
        {
          id: 'attachment-1',
          type: 'IMAGE',
          url: 'https://res.cloudinary.com/demo/image/upload/v1/chat/photo.jpg',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 120000,
        },
      ],
      sentAt: new Date('2026-07-06T00:00:00.000Z'),
    };
    const thread = {
      id: 'thread-1',
      shopId: 'shop-1',
      buyerUserId: 'buyer-1',
      sellerUserId: 'seller-1',
      lastMessage: createdMessage,
      messages: [createdMessage],
    };
    const catalogRpcService = {
      sendChatMessage: jest.fn().mockResolvedValue(thread),
    };
    const emit = jest.fn();
    const io = {
      to: jest.fn().mockReturnValue({ emit }),
    };
    const service = new ChatRealtimeService(
      {} as never,
      catalogRpcService as never,
      {} as never,
      {} as never,
      {} as never,
      new ConfigService(),
    );
    Object.defineProperty(service, 'io', { value: io, writable: true });

    await service.sendMessage(
      {} as never,
      { userId: 'user-1', role: 'BUYER' },
      {
        threadId: ' thread-1 ',
        body: ' Xin chao shop ',
        clientMessageId: ' client-1 ',
        attachments: [
          {
            type: 'IMAGE',
            url: ' https://res.cloudinary.com/demo/image/upload/v1/chat/photo.jpg ',
            fileName: ' photo.jpg ',
            mimeType: ' image/jpeg ',
            sizeBytes: 120000,
          },
        ],
      },
    );

    expect(catalogRpcService.sendChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      requesterUserId: 'user-1',
      requesterRole: 'BUYER',
      body: 'Xin chao shop',
      clientMessageId: 'client-1',
      attachments: [
        {
          type: 'IMAGE',
          url: 'https://res.cloudinary.com/demo/image/upload/v1/chat/photo.jpg',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 120000,
        },
      ],
      messageType: 'TEXT',
    });
    expect(io.to).toHaveBeenCalledWith('chat:thread:thread-1');
    expect(emit).toHaveBeenCalledWith('chat:message.created', {
      eventName: 'chat.message.created.v1',
      threadId: 'thread-1',
      thread,
      message: createdMessage,
      clientMessageId: 'client-1',
    });
  });
});
