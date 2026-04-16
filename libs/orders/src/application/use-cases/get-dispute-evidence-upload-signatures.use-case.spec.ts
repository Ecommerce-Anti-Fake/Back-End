import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { MediaService } from '@media';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { GetDisputeEvidenceUploadSignaturesUseCase } from './get-dispute-evidence-upload-signatures.use-case';

describe('GetDisputeEvidenceUploadSignaturesUseCase', () => {
  let useCase: GetDisputeEvidenceUploadSignaturesUseCase;

  const ordersRepositoryMock = {
    findDisputeById: jest.fn(),
  };

  const mediaServiceMock = {
    createCloudinaryUploadSignature: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDisputeEvidenceUploadSignaturesUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: MediaService, useValue: mediaServiceMock },
      ],
    }).compile();

    useCase = module.get<GetDisputeEvidenceUploadSignaturesUseCase>(GetDisputeEvidenceUploadSignaturesUseCase);
  });

  it('should return signatures for multiple evidence items including video', async () => {
    ordersRepositoryMock.findDisputeById.mockResolvedValueOnce(createDisputeRecord());
    mediaServiceMock.createCloudinaryUploadSignature
      .mockReturnValueOnce({
        cloudName: 'demo',
        apiKey: 'key',
        timestamp: 1776240000,
        folder: 'disputes/dispute-1',
        publicId: 'disputes/dispute-1/buyer-user-1-1776240000-1',
        uploadResourceType: 'image',
        signature: 'sig-1',
      })
      .mockReturnValueOnce({
        cloudName: 'demo',
        apiKey: 'key',
        timestamp: 1776240000,
        folder: 'disputes/dispute-1',
        publicId: 'disputes/dispute-1/buyer-user-1-1776240000-2',
        uploadResourceType: 'video',
        signature: 'sig-2',
      });

    const result = await useCase.execute({
      disputeId: 'dispute-1',
      requesterUserId: 'buyer-user-1',
      items: [{ assetType: 'IMAGE' }, { assetType: 'VIDEO' }],
    });

    expect(mediaServiceMock.createCloudinaryUploadSignature).toHaveBeenNthCalledWith(1, {
      folder: 'disputes/dispute-1',
      requesterUserId: 'buyer-user-1',
      assetType: 'IMAGE',
      sequence: 1,
    });
    expect(mediaServiceMock.createCloudinaryUploadSignature).toHaveBeenNthCalledWith(2, {
      folder: 'disputes/dispute-1',
      requesterUserId: 'buyer-user-1',
      assetType: 'VIDEO',
      sequence: 2,
    });
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({
      uploadResourceType: 'video',
    });
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
