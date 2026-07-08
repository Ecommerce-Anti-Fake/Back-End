import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StartShopChatThreadUseCase } from './start-shop-chat-thread.use-case';

describe('StartShopChatThreadUseCase', () => {
  const repository = {
    findShopByOwnerUserId: jest.fn(),
    findChatThreadByShopAndBuyer: jest.fn(),
    createChatThread: jest.fn(),
  };
  const useCase = new StartShopChatThreadUseCase(repository as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a thread from the requester shop to the target user', async () => {
    repository.findShopByOwnerUserId.mockResolvedValue({ id: 'shop-1', ownerUserId: 'seller-1' });
    repository.findChatThreadByShopAndBuyer.mockResolvedValue(null);
    repository.createChatThread.mockResolvedValue({ id: 'thread-1' });

    await expect(useCase.execute({ requesterUserId: 'seller-1', userId: 'buyer-1' }))
      .resolves.toEqual({ success: true, threadId: 'thread-1' });
    expect(repository.createChatThread).toHaveBeenCalledWith({
      shopId: 'shop-1',
      buyerUserId: 'buyer-1',
      sellerUserId: 'seller-1',
    });
  });

  it('reuses the existing shop and buyer thread', async () => {
    repository.findShopByOwnerUserId.mockResolvedValue({ id: 'shop-1', ownerUserId: 'seller-1' });
    repository.findChatThreadByShopAndBuyer.mockResolvedValue({ id: 'thread-1' });

    await expect(useCase.execute({ requesterUserId: 'seller-1', userId: 'buyer-1' }))
      .resolves.toEqual({ success: true, threadId: 'thread-1' });
    expect(repository.createChatThread).not.toHaveBeenCalled();
  });

  it('blocks a shop owner from chatting with themself', async () => {
    await expect(useCase.execute({ requesterUserId: 'seller-1', userId: 'seller-1' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findShopByOwnerUserId).not.toHaveBeenCalled();
  });

  it('rejects a requester that does not own a shop', async () => {
    repository.findShopByOwnerUserId.mockResolvedValue(null);

    await expect(useCase.execute({ requesterUserId: 'user-1', userId: 'buyer-1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
