import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ListSellerShopOrdersUseCase } from './list-seller-shop-orders.use-case';

describe('ListSellerShopOrdersUseCase', () => {
  let useCase: ListSellerShopOrdersUseCase;

  const ordersRepositoryMock = {
    findSellerShopOrders: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSellerShopOrdersUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ListSellerShopOrdersUseCase>(ListSellerShopOrdersUseCase);
  });

  it('returns paginated compact seller shop orders with customer info and status filter', async () => {
    ordersRepositoryMock.findSellerShopOrders.mockResolvedValueOnce({
      total: 2,
      page: 2,
      pageSize: 1,
      items: [
        {
          id: 'order-1',
          buyerUserId: 'buyer-1',
          buyer: {
            id: 'buyer-1',
            displayName: 'Nguyen Van A',
            email: 'buyer@example.com',
          },
          shippingName: 'Shipping Name',
          buyerPayableAmount: 250000,
          orderStatus: 'pending',
        },
      ],
    });

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      orderStatus: 'pending',
      page: 2,
      pageSize: 1,
    });

    expect(ordersRepositoryMock.findSellerShopOrders).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      shopId: 'shop-1',
      orderStatus: 'pending',
      page: 2,
      pageSize: 1,
    });
    expect(result).toEqual({
      total: 2,
      page: 2,
      pageSize: 1,
      items: [
        {
          orderId: 'order-1',
          customer: {
            id: 'buyer-1',
            name: 'Nguyen Van A',
            email: 'buyer@example.com',
          },
          orderAmount: 250000,
          orderStatus: 'pending',
        },
      ],
    });
  });
});
