import { Test, TestingModule } from '@nestjs/testing';
import { ResolveAdminDisputeUseCase } from './resolve-admin-dispute.use-case';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';

describe('ResolveAdminDisputeUseCase', () => {
  let useCase: ResolveAdminDisputeUseCase;

  const ordersRepositoryMock = {
    findDisputeById: jest.fn(),
    upsertDisputeModerationCase: jest.fn(),
    findEvidenceByDisputeId: jest.fn(),
    createAuditLog: jest.fn(),
    findAuditLogsByTarget: jest.fn(),
  };
  const orderReversalServiceMock = {
    resolveDispute: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveAdminDisputeUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderReversalService, useValue: orderReversalServiceMock },
      ],
    }).compile();

    useCase = module.get<ResolveAdminDisputeUseCase>(ResolveAdminDisputeUseCase);
  });

  it('should allow admin to resolve an open dispute and close moderation case', async () => {
    const dispute = {
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
    };

    ordersRepositoryMock.findDisputeById.mockResolvedValueOnce(dispute);
    orderReversalServiceMock.resolveDispute.mockResolvedValueOnce({
      ...dispute,
      disputeStatus: 'RESOLVED',
      resolvedAt: new Date('2026-04-16T09:30:00.000Z'),
    });
    ordersRepositoryMock.upsertDisputeModerationCase.mockResolvedValueOnce({
      id: 'case-1',
      caseStatus: 'RESOLVED',
      internalNote: 'Admin da xu ly',
      assignedAdminUserId: 'admin-1',
      createdAt: new Date('2026-04-16T09:10:00.000Z'),
      resolvedAt: new Date('2026-04-16T09:30:00.000Z'),
    });
    ordersRepositoryMock.findEvidenceByDisputeId.mockResolvedValueOnce([]);
    ordersRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([]);

    const result = await useCase.execute({
      disputeId: 'dispute-1',
      requesterUserId: 'admin-1',
      resolution: 'RESOLVED',
      internalNote: 'Admin da xu ly',
    });

    expect(orderReversalServiceMock.resolveDispute).toHaveBeenCalledWith({
      disputeId: 'dispute-1',
      resolution: 'RESOLVED',
    });
    expect(result.dispute).toMatchObject({
      id: 'dispute-1',
      disputeStatus: 'RESOLVED',
    });
    expect(result.moderationCase).toMatchObject({
      id: 'case-1',
      caseStatus: 'RESOLVED',
    });
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'DISPUTE',
        action: 'DISPUTE_RESOLVED_BY_ADMIN',
        toStatus: 'RESOLVED',
      }),
    );
  });
});
