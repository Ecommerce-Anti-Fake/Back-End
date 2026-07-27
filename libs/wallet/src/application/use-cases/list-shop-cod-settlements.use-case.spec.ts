import { ListShopCodSettlementsUseCase } from './list-shop-cod-settlements.use-case';

describe('ListShopCodSettlementsUseCase', () => {
  it('lists COD obligations for a shop owner', async () => {
    const walletService = { canAccessShopWallet: jest.fn().mockResolvedValue(true) };
    const codSettlement = {
      listShop: jest.fn().mockResolvedValue([{ id: 'settlement-1', status: 'OUTSTANDING' }]),
    };
    const useCase = new ListShopCodSettlementsUseCase(
      walletService as never,
      codSettlement as never,
    );

    await expect(useCase.execute({
      shopId: 'shop-1',
      requesterUserId: 'owner-1',
      requesterRole: 'user',
    })).resolves.toEqual([{ id: 'settlement-1', status: 'OUTSTANDING' }]);
  });
});
