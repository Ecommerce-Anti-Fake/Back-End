import { Test, TestingModule } from '@nestjs/testing';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { GetAdminFinanceReconciliationUseCase } from './get-admin-finance-reconciliation.use-case';

describe('GetAdminFinanceReconciliationUseCase', () => {
  let useCase: GetAdminFinanceReconciliationUseCase;

  const ordersRepositoryMock = {
    findAdminFinanceReconciliation: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAdminFinanceReconciliationUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetAdminFinanceReconciliationUseCase>(GetAdminFinanceReconciliationUseCase);
  });

  it('should pass admin finance filters to the repository', async () => {
    ordersRepositoryMock.findAdminFinanceReconciliation.mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 20,
      summary: {
        orderCount: 1,
        buyerPayableTotal: 100,
        platformFeeTotal: 20,
        sellerReceivableTotal: 80,
        sellerPayoutReadyTotal: 80,
        escrowHeldTotal: 0,
        escrowFrozenTotal: 0,
        refundTotal: 0,
        affiliatePendingLiabilityTotal: 5,
        affiliatePaidTotal: 0,
      },
      items: [
        {
          orderId: 'order-1',
          shopId: 'shop-1',
          shopName: 'Factory Shop',
          paymentStatus: 'PAID',
          escrowStatus: 'RELEASED',
          payoutStatus: 'READY_FOR_PAYOUT',
          buyerPayableAmount: 100,
          platformFeeAmount: 20,
          sellerReceivableAmount: 80,
          sellerPayoutReadyAmount: 80,
          refundAmount: 0,
          affiliatePendingLiabilityAmount: 5,
          affiliatePaidAmount: 0,
          createdAt: new Date('2026-05-21T10:00:00.000Z'),
        },
      ],
    });

    const result = await useCase.execute({
      fromDate: '2026-05-01T00:00:00.000Z',
      toDate: '2026-05-31T23:59:59.999Z',
      shopId: 'shop-1',
      orderId: 'order',
      paymentStatus: 'PAID',
      escrowStatus: 'RELEASED',
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });

    expect(ordersRepositoryMock.findAdminFinanceReconciliation).toHaveBeenCalledWith({
      fromDate: '2026-05-01T00:00:00.000Z',
      toDate: '2026-05-31T23:59:59.999Z',
      shopId: 'shop-1',
      orderId: 'order',
      paymentStatus: 'PAID',
      escrowStatus: 'RELEASED',
      page: 1,
      pageSize: 20,
      sortOrder: 'desc',
    });
    expect(result.summary.sellerPayoutReadyTotal).toBe(80);
    expect(result.items[0].affiliatePendingLiabilityAmount).toBe(5);
  });
});
