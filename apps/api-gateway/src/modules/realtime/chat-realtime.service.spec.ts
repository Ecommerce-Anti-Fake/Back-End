import { ChatRealtimeService } from './chat-realtime.service';

describe('ChatRealtimeService', () => {
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
