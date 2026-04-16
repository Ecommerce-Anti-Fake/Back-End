import { Test, TestingModule } from '@nestjs/testing';
import { GetAdminDisputeDetailUseCase } from './get-admin-dispute-detail.use-case';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

describe('GetAdminDisputeDetailUseCase', () => {
  let useCase: GetAdminDisputeDetailUseCase;

  const ordersRepositoryMock = {
    findDisputeById: jest.fn(),
    findEvidenceByDisputeId: jest.fn(),
    findModerationCaseByTarget: jest.fn(),
    findAuditLogsByTarget: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAdminDisputeDetailUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<GetAdminDisputeDetailUseCase>(GetAdminDisputeDetailUseCase);
  });

  it('should return dispute detail with order and evidence for admin', async () => {
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
        paymentIntent: {
          paymentStatus: 'PAID',
        },
        items: [
          {
            offerId: 'offer-1',
            offerTitleSnapshot: 'Kem chong nang',
            unitPrice: { toString: () => '100000' },
            quantity: 1,
            verificationLevelSnapshot: 'standard',
          },
        ],
      },
    });
    ordersRepositoryMock.findEvidenceByDisputeId.mockResolvedValueOnce([
      {
        id: 'evidence-1',
        disputeId: 'dispute-1',
        mediaAssetId: 'media-1',
        uploadedByUserId: 'buyer-1',
        fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/disputes/dispute-1/photo.jpg',
        fileType: 'image/jpeg',
        uploadedAt: new Date('2026-04-16T09:05:00.000Z'),
        mediaAsset: {
          mimeType: 'image/jpeg',
          assetType: 'IMAGE',
          publicId: 'disputes/dispute-1/photo',
          secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/disputes/dispute-1/photo.jpg',
        },
      },
    ]);
    ordersRepositoryMock.findModerationCaseByTarget.mockResolvedValueOnce(null);
    ordersRepositoryMock.findAuditLogsByTarget.mockResolvedValueOnce([
      {
        id: 'audit-1',
        action: 'DISPUTE_OPENED',
        fromStatus: null,
        toStatus: 'OPEN',
        note: 'Hang sai mo ta',
        actorUserId: 'user-1',
        createdAt: new Date('2026-04-16T09:00:00.000Z'),
        actor: {
          displayName: 'Buyer',
          email: 'buyer@example.com',
        },
      },
    ]);

    const result = await useCase.execute('dispute-1');

    expect(result).toMatchObject({
      dispute: {
        id: 'dispute-1',
        orderId: 'order-1',
      },
      order: {
        id: 'order-1',
        sellerShopId: 'shop-1',
      },
      evidence: [
        {
          id: 'evidence-1',
          disputeId: 'dispute-1',
        },
      ],
      timeline: [
        {
          id: 'audit-1',
          action: 'DISPUTE_OPENED',
        },
      ],
    });
  });
});
