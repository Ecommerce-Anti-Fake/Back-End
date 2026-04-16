import { Test, TestingModule } from '@nestjs/testing';
import { AssignAdminDisputeUseCase } from './assign-admin-dispute.use-case';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

describe('AssignAdminDisputeUseCase', () => {
  let useCase: AssignAdminDisputeUseCase;

  const ordersRepositoryMock = {
    findDisputeById: jest.fn(),
    findModerationCaseByTarget: jest.fn(),
    upsertDisputeModerationCase: jest.fn(),
    findEvidenceByDisputeId: jest.fn(),
    createAuditLog: jest.fn(),
    findAuditLogsByTarget: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignAdminDisputeUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<AssignAdminDisputeUseCase>(AssignAdminDisputeUseCase);
  });

  it('should assign dispute to admin and return detail', async () => {
    ordersRepositoryMock.findDisputeById.mockResolvedValueOnce({
      id: 'dispute-1',
      orderId: 'order-1',
      disputeStatus: 'OPEN',
      reason: 'Hang sai mo ta',
      openedByUserId: 'user-1',
      openedAt: new Date('2026-04-16T09:00:00.000Z'),
      order: {
        id: 'order-1',
        orderMode: 'RETAIL',
        orderStatus: 'paid',
        buyerUserId: 'buyer-1',
        buyerShopId: null,
        buyerDistributionNodeId: null,
        baseAmount: { toString: () => '100000' },
        discountAmount: { toString: () => '0' },
        platformFeeAmount: { toString: () => '1000' },
        buyerPayableAmount: { toString: () => '101000' },
        sellerReceivableAmount: { toString: () => '100000' },
        totalAmount: { toString: () => '101000' },
        createdAt: new Date('2026-04-16T08:00:00.000Z'),
        shopId: 'shop-1',
        shop: {
          shopName: 'Factory Shop',
          ownerUserId: 'seller-1',
        },
        buyerShop: null,
        paymentIntent: { paymentStatus: 'PAID' },
        items: [],
      },
    });
    ordersRepositoryMock.findModerationCaseByTarget.mockResolvedValueOnce(null);
    ordersRepositoryMock.upsertDisputeModerationCase.mockResolvedValueOnce({
      id: 'case-1',
      caseStatus: 'ASSIGNED',
      internalNote: 'Nhan xu ly',
      assignedAdminUserId: 'admin-1',
      createdAt: new Date('2026-04-16T09:10:00.000Z'),
      resolvedAt: null,
    });
    ordersRepositoryMock.findEvidenceByDisputeId.mockResolvedValueOnce([]);
    ordersRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([]);

    const result = await useCase.execute({
      disputeId: 'dispute-1',
      requesterUserId: 'admin-1',
      internalNote: 'Nhan xu ly',
    });

    expect(ordersRepositoryMock.upsertDisputeModerationCase).toHaveBeenCalledWith(
      expect.objectContaining({
        disputeId: 'dispute-1',
        assignedAdminUserId: 'admin-1',
        caseStatus: 'ASSIGNED',
      }),
    );
    expect(result.moderationCase).toMatchObject({
      id: 'case-1',
      caseStatus: 'ASSIGNED',
      assignedAdminUserId: 'admin-1',
    });
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'DISPUTE',
        action: 'DISPUTE_ASSIGNED',
        toStatus: 'ASSIGNED',
      }),
    );
  });
});
