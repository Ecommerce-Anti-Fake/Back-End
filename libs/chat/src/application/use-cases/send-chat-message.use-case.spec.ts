import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SendChatMessageUseCase } from './send-chat-message.use-case';

describe('SendChatMessageUseCase in ChatModule', () => {
  const repository = {
    findChatThreadById: jest.fn(),
    createChatMessage: jest.fn(),
  };
  const useCase = new SendChatMessageUseCase(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects non-participants', async () => {
    repository.findChatThreadById.mockResolvedValue(chatThread());

    await expect(
      useCase.execute({
        threadId: 'thread-1',
        requesterUserId: 'stranger',
        body: 'Xin chao',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.createChatMessage).not.toHaveBeenCalled();
  });

  it('rejects an admin who is not a thread participant', async () => {
    repository.findChatThreadById.mockResolvedValue(chatThread());

    await expect(useCase.execute({
      threadId: 'thread-1', requesterUserId: 'admin-1', requesterRole: 'admin', body: 'Xin chao',
    })).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.createChatMessage).not.toHaveBeenCalled();
  });

  it('passes client message id for idempotent retries', async () => {
    repository.findChatThreadById.mockResolvedValue(chatThread());
    repository.createChatMessage.mockResolvedValue(chatThread({ body: 'Can ho tro dispute', clientMessageId: 'client-1' }));

    const result = await useCase.execute({
      threadId: 'thread-1',
      requesterUserId: 'buyer-1',
      body: 'Can ho tro dispute',
      clientMessageId: ' client-1 ',
    });

    expect(repository.createChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      senderUserId: 'buyer-1',
      clientMessageId: 'client-1',
      body: 'Can ho tro dispute',
      attachments: [],
      messageType: 'TEXT',
    });
    expect(result.lastMessage?.clientMessageId).toBe('client-1');
  });

  it('allows text and attachments in the same message', async () => {
    const attachments = [
      {
        type: 'IMAGE' as const,
        url: 'https://res.cloudinary.com/demo/image/upload/v1/chat/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 120_000,
      },
    ];
    repository.findChatThreadById.mockResolvedValue(chatThread());
    repository.createChatMessage.mockResolvedValue(chatThread({ body: 'Anh san pham', attachments }));

    const result = await useCase.execute({
      threadId: 'thread-1',
      requesterUserId: 'buyer-1',
      body: ' Anh san pham ',
      attachments,
    });

    expect(repository.createChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      senderUserId: 'buyer-1',
      clientMessageId: null,
      body: 'Anh san pham',
      attachments,
      messageType: 'TEXT',
    });
    expect(result.lastMessage?.attachments).toEqual([
      {
        id: 'attachment-1',
        type: 'IMAGE',
        url: 'https://res.cloudinary.com/demo/image/upload/v1/chat/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 120_000,
      },
    ]);
  });

  it('allows attachment-only messages', async () => {
    const attachments = [
      {
        type: 'FILE' as const,
        url: 'https://res.cloudinary.com/demo/raw/upload/v1/chat/spec.pdf',
        fileName: 'spec.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 240_000,
      },
    ];
    repository.findChatThreadById.mockResolvedValue(chatThread());
    repository.createChatMessage.mockResolvedValue(chatThread({ body: null, attachments }));

    await useCase.execute({
      threadId: 'thread-1',
      requesterUserId: 'buyer-1',
      attachments,
    });

    expect(repository.createChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      senderUserId: 'buyer-1',
      clientMessageId: null,
      body: null,
      attachments,
      messageType: 'TEXT',
    });
  });

  it('rejects invalid attachment metadata', async () => {
    repository.findChatThreadById.mockResolvedValue(chatThread());

    await expect(
      useCase.execute({
        threadId: 'thread-1',
        requesterUserId: 'buyer-1',
        attachments: [
          {
            type: 'IMAGE',
            url: '',
            fileName: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 120_000,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createChatMessage).not.toHaveBeenCalled();
  });

  it('returns not found for missing threads', async () => {
    repository.findChatThreadById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        threadId: 'missing',
        requesterUserId: 'buyer-1',
        body: 'Xin chao',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function chatThread(
  input: {
    body?: string | null;
    clientMessageId?: string | null;
    attachments?: Array<{
      type: 'IMAGE' | 'FILE';
      url: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    }>;
  } = {},
) {
  return {
    id: 'thread-1',
    shopId: 'shop-1',
    buyerUserId: 'buyer-1',
    sellerUserId: 'seller-1',
    createdAt: new Date('2026-05-26T01:00:00.000Z'),
    shop: { shopName: 'Shop A' },
    buyer: { displayName: 'Buyer', email: null, phone: null },
    seller: { displayName: 'Seller', email: null, phone: null },
    messages: [
      {
        id: 'message-1',
        threadId: 'thread-1',
        senderUserId: 'buyer-1',
        clientMessageId: input.clientMessageId ?? null,
        messageType: 'TEXT',
        body: input.body === undefined ? 'Xin chao' : input.body,
        attachments: (input.attachments ?? []).map((attachment, index) => ({
          id: `attachment-${index + 1}`,
          ...attachment,
        })),
        sentAt: new Date('2026-05-26T01:01:00.000Z'),
        sender: { displayName: 'Buyer', email: null, phone: null },
      },
    ],
  };
}
