import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MediaService } from '@media';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { AddDisputeEvidenceBatchUseCase } from './add-dispute-evidence-batch.use-case';

describe('AddDisputeEvidenceBatchUseCase', () => {
  let useCase: AddDisputeEvidenceBatchUseCase;

  const ordersRepositoryMock = {
    findDisputeById: jest.fn(),
    createDisputeEvidence: jest.fn(),
    createAuditLog: jest.fn(),
  };

  const mediaServiceMock = {
    isOwnedCloudinaryUrl: jest.fn(),
    createCloudinaryAsset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddDisputeEvidenceBatchUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<AddDisputeEvidenceBatchUseCase>(AddDisputeEvidenceBatchUseCase);
  });

  it('should persist multiple evidence items in one request', async () => {
    ordersRepositoryMock.findDisputeById.mockResolvedValue(createDisputeRecord());
    mediaServiceMock.isOwnedCloudinaryUrl.mockReturnValue(true);
    mediaServiceMock.createCloudinaryAsset
      .mockResolvedValueOnce({
        id: 'media-1',
        ownerUserId: 'buyer-user-1',
        provider: 'CLOUDINARY',
        assetType: 'IMAGE',
        resourceType: 'DISPUTE_EVIDENCE',
        publicId: 'disputes/dispute-1/buyer-user-1-1',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/disputes/dispute-1/photo.jpg',
        mimeType: 'image/jpeg',
        folder: 'disputes/dispute-1',
        uploadedAt: new Date('2026-04-15T10:05:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'media-2',
        ownerUserId: 'buyer-user-1',
        provider: 'CLOUDINARY',
        assetType: 'VIDEO',
        resourceType: 'DISPUTE_EVIDENCE',
        publicId: 'disputes/dispute-1/buyer-user-1-2',
        secureUrl: 'https://res.cloudinary.com/demo/video/upload/v1/disputes/dispute-1/clip.mp4',
        mimeType: 'video/mp4',
        folder: 'disputes/dispute-1',
        uploadedAt: new Date('2026-04-15T10:05:00.000Z'),
      });
    ordersRepositoryMock.createDisputeEvidence
      .mockResolvedValueOnce({
        id: 'evidence-1',
        disputeId: 'dispute-1',
        uploadedByUserId: 'buyer-user-1',
        mediaAssetId: 'media-1',
        fileType: 'image/jpeg',
        fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/disputes/dispute-1/photo.jpg',
        uploadedAt: new Date('2026-04-15T10:05:00.000Z'),
        mediaAsset: {
          id: 'media-1',
          ownerUserId: 'buyer-user-1',
          provider: 'CLOUDINARY',
          assetType: 'IMAGE',
          resourceType: 'DISPUTE_EVIDENCE',
          publicId: 'disputes/dispute-1/buyer-user-1-1',
          secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/disputes/dispute-1/photo.jpg',
          mimeType: 'image/jpeg',
          folder: 'disputes/dispute-1',
          uploadedAt: new Date('2026-04-15T10:05:00.000Z'),
        },
      })
      .mockResolvedValueOnce({
        id: 'evidence-2',
        disputeId: 'dispute-1',
        uploadedByUserId: 'buyer-user-1',
        mediaAssetId: 'media-2',
        fileType: 'video/mp4',
        fileUrl: 'https://res.cloudinary.com/demo/video/upload/v1/disputes/dispute-1/clip.mp4',
        uploadedAt: new Date('2026-04-15T10:05:00.000Z'),
        mediaAsset: {
          id: 'media-2',
          ownerUserId: 'buyer-user-1',
          provider: 'CLOUDINARY',
          assetType: 'VIDEO',
          resourceType: 'DISPUTE_EVIDENCE',
          publicId: 'disputes/dispute-1/buyer-user-1-2',
          secureUrl: 'https://res.cloudinary.com/demo/video/upload/v1/disputes/dispute-1/clip.mp4',
          mimeType: 'video/mp4',
          folder: 'disputes/dispute-1',
          uploadedAt: new Date('2026-04-15T10:05:00.000Z'),
        },
      });

    const result = await useCase.execute({
      disputeId: 'dispute-1',
      requesterUserId: 'buyer-user-1',
      items: [
        {
          assetType: 'IMAGE',
          mimeType: 'image/jpeg',
          fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1/disputes/dispute-1/photo.jpg',
          publicId: 'disputes/dispute-1/buyer-user-1-1',
        },
        {
          assetType: 'VIDEO',
          mimeType: 'video/mp4',
          fileUrl: 'https://res.cloudinary.com/demo/video/upload/v1/disputes/dispute-1/clip.mp4',
          publicId: 'disputes/dispute-1/buyer-user-1-2',
        },
      ],
    });

    expect(result).toHaveLength(2);
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'DISPUTE',
        targetId: 'dispute-1',
        actorUserId: 'buyer-user-1',
        action: 'DISPUTE_EVIDENCE_ADDED',
      }),
    );
    expect(result[0]).toMatchObject({ assetType: 'IMAGE' });
    expect(result[1]).toMatchObject({ assetType: 'VIDEO' });
  });
});

function createDisputeRecord() {
  return {
    id: 'dispute-1',
    orderId: 'order-1',
    openedByUserId: 'buyer-user-1',
    reason: 'Wrong item delivered',
    disputeStatus: 'OPEN',
    openedAt: new Date('2026-04-15T10:00:00.000Z'),
    resolvedAt: null,
    order: {
      id: 'order-1',
      orderMode: 'RETAIL',
      orderStatus: 'paid',
      shopId: 'seller-shop-1',
      buyerUserId: 'buyer-user-1',
      buyerShopId: null,
      buyerDistributionNodeId: null,
      baseAmount: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0),
      platformFeeAmount: new Prisma.Decimal(20),
      buyerPayableAmount: new Prisma.Decimal(100),
      sellerReceivableAmount: new Prisma.Decimal(80),
      totalAmount: new Prisma.Decimal(100),
      createdAt: new Date('2026-04-15T10:00:00.000Z'),
      shop: {
        ownerUserId: 'seller-user-1',
      },
      buyerShop: null,
      paymentIntent: {
        id: 'payment-1',
        orderId: 'order-1',
        paymentMethod: 'manual_confirmation',
        paymentStatus: 'PAID',
        amount: new Prisma.Decimal(100),
        providerRef: null,
        createdAt: new Date('2026-04-15T10:00:00.000Z'),
      },
      items: [],
    },
  };
}
