import { ShopController } from './shop.controller';

describe('ShopController', () => {
  it('lists public shops with pagination defaults', async () => {
    const shopsRpcService = {
      findPublic: jest.fn().mockResolvedValue({
        total: 1,
        page: 1,
        pageSize: 20,
        items: [
          {
            id: 'shop-1',
            name: 'Shop ABC',
            avatarUrl: '',
            isVerified: true,
            rating: 4.5,
            totalReviews: 2,
            totalSale: 15,
          },
        ],
      }),
    };
    const controller = new ShopController(shopsRpcService as never);

    await expect(controller.findPublic({})).resolves.toEqual({
      total: 1,
      page: 1,
      pageSize: 20,
      items: [
        {
          id: 'shop-1',
          name: 'Shop ABC',
          avatarUrl: '',
          isVerified: true,
          rating: 4.5,
          totalReviews: 2,
          totalSale: 15,
        },
      ],
    });
    expect(shopsRpcService.findPublic).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
    });
  });

  it('gets public shop summary by offer id', async () => {
    const shopsRpcService = {
      findByOffer: jest.fn().mockResolvedValue({
        id: 'shop-1',
        name: 'Shop ABC',
        avatarUrl: '',
        isVerified: true,
        rating: 5,
        totalReviews: 1,
        totalSale: 3,
      }),
    };
    const controller = new ShopController(shopsRpcService as never);

    await expect(controller.findByOfferId('offer-1')).resolves.toEqual({
      id: 'shop-1',
      name: 'Shop ABC',
      avatarUrl: '',
      isVerified: true,
      rating: 5,
      totalReviews: 1,
      totalSale: 3,
    });
    expect(shopsRpcService.findByOffer).toHaveBeenCalledWith({ offerId: 'offer-1' });
  });
});
