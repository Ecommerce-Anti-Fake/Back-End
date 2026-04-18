import { Test, TestingModule } from '@nestjs/testing';
import { ListAdminOpenDisputesUseCase } from './list-admin-open-disputes.use-case';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

describe('ListAdminOpenDisputesUseCase', () => {
  let useCase: ListAdminOpenDisputesUseCase;

  const ordersRepositoryMock = {
    findOpenDisputesForAdmin: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAdminOpenDisputesUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<ListAdminOpenDisputesUseCase>(ListAdminOpenDisputesUseCase);
  });

  it('should return open disputes for admin', async () => {
    ordersRepositoryMock.findOpenDisputesForAdmin.mockResolvedValueOnce({
      total: 1,
      items: [
        {
          id: 'dispute-1',
          orderId: 'order-1',
          disputeStatus: 'OPEN',
          reason: 'Hang sai mo ta',
          openedByUserId: 'user-1',
          openedAt: new Date('2026-04-16T09:00:00.000Z'),
          order: {
            shopId: 'shop-1',
            buyerUserId: 'buyer-1',
            buyerShopId: null,
            orderStatus: 'paid',
            shop: {
              shopName: 'Factory Shop',
            },
          },
        },
      ],
    });

    const result = await useCase.execute({
      disputeStatus: 'OPEN',
      assignedAdminUserId: 'admin-1',
      reason: 'hang sai',
      search: 'factory',
      page: 2,
      pageSize: 15,
      sortBy: 'orderId',
      sortOrder: 'asc',
    });

    expect(ordersRepositoryMock.findOpenDisputesForAdmin).toHaveBeenCalledWith({
      disputeStatus: 'OPEN',
      assignedAdminUserId: 'admin-1',
      reason: 'hang sai',
      search: 'factory',
      page: 2,
      pageSize: 15,
      sortBy: 'orderId',
      sortOrder: 'asc',
    });

    expect(result).toMatchObject({
      page: 2,
      pageSize: 15,
      total: 1,
      items: [
        {
          id: 'dispute-1',
          orderId: 'order-1',
          sellerShopId: 'shop-1',
          sellerShopName: 'Factory Shop',
          orderStatus: 'paid',
        },
      ],
    });
  });
});
