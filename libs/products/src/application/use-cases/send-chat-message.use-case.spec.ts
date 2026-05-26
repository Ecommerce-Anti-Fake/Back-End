import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SendChatMessageUseCase } from './send-chat-message.use-case';

describe('SendChatMessageUseCase', () => {
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

  it('allows an admin participant override', async () => {
    repository.findChatThreadById.mockResolvedValue(chatThread());
    repository.createChatMessage.mockResolvedValue(chatThread({ body: 'Can ho tro dispute' }));

    const result = await useCase.execute({
      threadId: 'thread-1',
      requesterUserId: 'admin-1',
      requesterRole: 'admin',
      body: ' Can ho tro dispute ',
    });

    expect(repository.createChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      senderUserId: 'admin-1',
      body: 'Can ho tro dispute',
      messageType: 'TEXT',
    });
    expect(result.lastMessage?.body).toBe('Can ho tro dispute');
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

function chatThread(input: { body?: string } = {}) {
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
        messageType: 'TEXT',
        body: input.body ?? 'Xin chao',
        sentAt: new Date('2026-05-26T01:01:00.000Z'),
        sender: { displayName: 'Buyer', email: null, phone: null },
      },
    ],
  };
}
