import { Test } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { GetSellerShopOrderStatusSummaryUseCase } from './get-seller-shop-order-status-summary.use-case';

describe('GetSellerShopOrderStatusSummaryUseCase', () => {
  it('returns the all-time order status counts for an owned shop', async () => {
    const ordersRepository = {
      getSellerShopOrderStatusSummary: jest.fn().mockResolvedValue({
        totalOrders: 1284,
        pendingOrders: 42,
        shippingOrders: 156,
        completedOrders: 1086,
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        GetSellerShopOrderStatusSummaryUseCase,
        { provide: OrdersRepository, useValue: ordersRepository },
      ],
    }).compile();
    const useCase = module.get(GetSellerShopOrderStatusSummaryUseCase);

    await expect(
      useCase.execute({ requesterUserId: 'seller-1', shopId: 'shop-1' }),
    ).resolves.toEqual({
      totalOrders: 1284,
      pendingOrders: 42,
      shippingOrders: 156,
      completedOrders: 1086,
    });
    expect(ordersRepository.getSellerShopOrderStatusSummary).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
    });
  });
});
