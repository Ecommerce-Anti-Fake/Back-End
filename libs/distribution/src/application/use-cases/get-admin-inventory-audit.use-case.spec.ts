import { Test, TestingModule } from '@nestjs/testing';
import { GetAdminInventoryAuditUseCase } from './get-admin-inventory-audit.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('GetAdminInventoryAuditUseCase', () => {
  let useCase: GetAdminInventoryAuditUseCase;

  const repositoryMock = {
    findAdminInventoryAuditBatches: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAdminInventoryAuditUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<GetAdminInventoryAuditUseCase>(GetAdminInventoryAuditUseCase);
  });

  it('maps inventory movements and restored cancelled allocations', async () => {
    const receivedAt = new Date('2026-05-01T00:00:00.000Z');
    const linkedAt = new Date('2026-05-02T00:00:00.000Z');
    const allocatedAt = new Date('2026-05-03T00:00:00.000Z');

    repositoryMock.findAdminInventoryAuditBatches.mockResolvedValueOnce([
      {
        id: 'batch-1',
        shopId: 'shop-1',
        batchNumber: 'BATCH-1',
        quantity: 100,
        receivedAt,
        shop: { shopName: 'Shop 1' },
        offerLinks: [
          {
            id: 'link-1',
            offerId: 'offer-1',
            allocatedQuantity: 20,
            createdAt: linkedAt,
            offer: { title: 'Offer 1' },
          },
        ],
        orderItemAllocations: [
          {
            id: 'allocation-1',
            quantity: 5,
            createdAt: allocatedAt,
            orderItem: {
              orderId: 'order-1',
              offerId: 'offer-1',
              offerTitleSnapshot: 'Offer 1',
              order: { orderStatus: 'cancelled' },
            },
          },
        ],
      },
    ]);

    const result = await useCase.execute({ orderId: 'order-1' });

    expect(repositoryMock.findAdminInventoryAuditBatches).toHaveBeenCalledWith({ orderId: 'order-1' });
    expect(result).toMatchObject({
      totalMovements: 4,
      totalReceivedQuantity: 100,
      totalOfferReservedQuantity: 20,
      totalFulfilledQuantity: 5,
      totalRestoredQuantity: 5,
    });
    expect(result.movements.map((movement) => movement.movementType)).toContain('FULFILLMENT_RESTORED');
  });
});
