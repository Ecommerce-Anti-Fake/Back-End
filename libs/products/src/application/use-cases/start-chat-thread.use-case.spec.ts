import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StartChatThreadUseCase } from './start-chat-thread.use-case';

describe('StartChatThreadUseCase', () => {
  const repository = {
    findShopForChat: jest.fn(),
    findChatThreadByShopAndBuyer: jest.fn(),
    createChatThread: jest.fn(),
    createChatMessage: jest.fn(),
  };
  const useCase = new StartChatThreadUseCase(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a buyer-seller thread for a shop', async () => {
    repository.findShopForChat.mockResolvedValue(shop());
    repository.findChatThreadByShopAndBuyer.mockResolvedValue(null);
    repository.createChatThread.mockResolvedValue(thread());

    const result = await useCase.execute({ requesterUserId: 'buyer-1', shopId: 'shop-1' });

    expect(repository.createChatThread).toHaveBeenCalledWith({
      shopId: 'shop-1',
      buyerUserId: 'buyer-1',
      sellerUserId: 'seller-1',
    });
    expect(result.buyerUserId).toBe('buyer-1');
    expect(result.sellerUserId).toBe('seller-1');
  });

  it('reuses existing thread and appends initial message', async () => {
    repository.findShopForChat.mockResolvedValue(shop());
    repository.findChatThreadByShopAndBuyer.mockResolvedValue(thread());
    repository.createChatMessage.mockResolvedValue(thread({ body: 'Tu van giup minh' }));

    const result = await useCase.execute({
      requesterUserId: 'buyer-1',
      shopId: 'shop-1',
      initialMessage: ' Tu van giup minh ',
    });

    expect(repository.createChatThread).not.toHaveBeenCalled();
    expect(repository.createChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      senderUserId: 'buyer-1',
      body: 'Tu van giup minh',
      messageType: 'TEXT',
    });
    expect(result.lastMessage?.body).toBe('Tu van giup minh');
  });

  it('blocks sellers from starting a buyer chat with their own shop', async () => {
    repository.findShopForChat.mockResolvedValue(shop());

    await expect(useCase.execute({ requesterUserId: 'seller-1', shopId: 'shop-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns not found for missing shops', async () => {
    repository.findShopForChat.mockResolvedValue(null);

    await expect(useCase.execute({ requesterUserId: 'buyer-1', shopId: 'missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

function shop() {
  return {
    id: 'shop-1',
    shopName: 'Shop A',
    ownerUserId: 'seller-1',
  };
}

function thread(input: { body?: string } = {}) {
  return {
    id: 'thread-1',
    shopId: 'shop-1',
    buyerUserId: 'buyer-1',
    sellerUserId: 'seller-1',
    createdAt: new Date('2026-05-26T01:00:00.000Z'),
    shop: { shopName: 'Shop A' },
    buyer: { displayName: 'Buyer', email: null, phone: null },
    seller: { displayName: 'Seller', email: null, phone: null },
    messages: input.body
      ? [
          {
            id: 'message-1',
            threadId: 'thread-1',
            senderUserId: 'buyer-1',
            messageType: 'TEXT',
            body: input.body,
            sentAt: new Date('2026-05-26T01:01:00.000Z'),
            sender: { displayName: 'Buyer', email: null, phone: null },
          },
        ]
      : [],
  };
}
