import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CreateReportUseCase } from './create-report.use-case';
import { RecalculateRiskTargetsUseCase } from './recalculate-risk-targets.use-case';

describe('CreateReportUseCase', () => {
  let useCase: CreateReportUseCase;

  const ordersRepositoryMock = {
    findOrderById: jest.fn(),
    findOfferReportTarget: jest.fn(),
    findShopReportTarget: jest.fn(),
    findSocialPostReportTarget: jest.fn(),
    findSocialCommentReportTarget: jest.fn(),
    findOpenReportByTarget: jest.fn(),
    createReport: jest.fn(),
    upsertReportModerationCase: jest.fn(),
    createAuditLog: jest.fn(),
  };
  const recalculateRiskTargetsUseCaseMock = {
    executeForReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateReportUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: RecalculateRiskTargetsUseCase, useValue: recalculateRiskTargetsUseCaseMock },
      ],
    }).compile();

    useCase = module.get<CreateReportUseCase>(CreateReportUseCase);
  });

  it('should create an order report for the buyer and open moderation case', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());
    ordersRepositoryMock.findOpenReportByTarget.mockResolvedValueOnce(null);
    ordersRepositoryMock.createReport.mockResolvedValueOnce(createReportRecord());

    const result = await useCase.execute({
      requesterUserId: 'buyer-user-1',
      targetType: 'ORDER',
      targetId: 'order-1',
      reason: 'Nghi ngo hang gia',
      description: 'Ma lo khong khop voi lineage.',
    });

    expect(ordersRepositoryMock.createReport).toHaveBeenCalledWith({
      reporterUserId: 'buyer-user-1',
      targetType: 'ORDER',
      targetId: 'order-1',
      reason: 'Nghi ngo hang gia\n\nMa lo khong khop voi lineage.',
    });
    expect(ordersRepositoryMock.upsertReportModerationCase).toHaveBeenCalledWith(
      expect.objectContaining({
        reportId: 'report-1',
        caseStatus: 'IN_REVIEW',
      }),
    );
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'REPORT',
        targetId: 'report-1',
        actorUserId: 'buyer-user-1',
        action: 'REPORT_CREATED',
        toStatus: 'OPEN',
      }),
    );
    expect(recalculateRiskTargetsUseCaseMock.executeForReport).toHaveBeenCalledWith({
      targetType: 'ORDER',
      targetId: 'order-1',
      actorUserId: 'buyer-user-1',
    });
    expect(result).toMatchObject({
      id: 'report-1',
      reportStatus: 'OPEN',
      targetLabel: 'Serum chong gia',
    });
  });

  it('should reject non-buyer order report', async () => {
    ordersRepositoryMock.findOrderById.mockResolvedValueOnce(createOrderRecord());

    await expect(
      useCase.execute({
        requesterUserId: 'seller-user-1',
        targetType: 'ORDER',
        targetId: 'order-1',
        reason: 'Nghi ngo',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should reject duplicate open report for same target', async () => {
    ordersRepositoryMock.findOfferReportTarget.mockResolvedValueOnce({ id: 'offer-1', title: 'Offer', shopId: 'shop-1' });
    ordersRepositoryMock.findOpenReportByTarget.mockResolvedValueOnce({ id: 'report-existing' });

    await expect(
      useCase.execute({
        requesterUserId: 'buyer-user-1',
        targetType: 'OFFER',
        targetId: 'offer-1',
        reason: 'Nghi ngo',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should create a social post report and open moderation case', async () => {
    ordersRepositoryMock.findSocialPostReportTarget.mockResolvedValueOnce({
      id: 'post-1',
      authorUserId: 'author-user-1',
      body: 'Bai viet nghi van spam hang gia tren bang tin cong dong',
      visibility: 'PUBLIC',
    });
    ordersRepositoryMock.findOpenReportByTarget.mockResolvedValueOnce(null);
    ordersRepositoryMock.createReport.mockResolvedValueOnce(
      createReportRecord({
        targetType: 'SOCIAL_POST',
        targetId: 'post-1',
        reason: 'Spam hang gia',
      }),
    );

    const result = await useCase.execute({
      requesterUserId: 'buyer-user-1',
      targetType: 'SOCIAL_POST',
      targetId: 'post-1',
      reason: 'Spam hang gia',
    });

    expect(ordersRepositoryMock.createReport).toHaveBeenCalledWith({
      reporterUserId: 'buyer-user-1',
      targetType: 'SOCIAL_POST',
      targetId: 'post-1',
      reason: 'Spam hang gia',
    });
    expect(recalculateRiskTargetsUseCaseMock.executeForReport).toHaveBeenCalledWith({
      targetType: 'SOCIAL_POST',
      targetId: 'post-1',
      actorUserId: 'buyer-user-1',
    });
    expect(result).toMatchObject({
      targetType: 'SOCIAL_POST',
      targetId: 'post-1',
      targetLabel: 'Bai viet nghi van spam hang gia tren bang tin cong dong',
    });
  });

  it('should reject reporting own social comment', async () => {
    ordersRepositoryMock.findSocialCommentReportTarget.mockResolvedValueOnce({
      id: 'comment-1',
      postId: 'post-1',
      authorUserId: 'buyer-user-1',
      body: 'Binh luan cua toi',
      visibility: 'PUBLIC',
      post: {
        id: 'post-1',
        visibility: 'PUBLIC',
      },
    });

    await expect(
      useCase.execute({
        requesterUserId: 'buyer-user-1',
        targetType: 'SOCIAL_COMMENT',
        targetId: 'comment-1',
        reason: 'Spam',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function createReportRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    reporterUserId: 'buyer-user-1',
    targetType: 'ORDER',
    targetId: 'order-1',
    reason: 'Nghi ngo hang gia\n\nMa lo khong khop voi lineage.',
    reportStatus: 'OPEN',
    createdAt: new Date('2026-05-20T10:00:00.000Z'),
    reporter: {
      id: 'buyer-user-1',
      displayName: 'Buyer',
      email: 'buyer@example.com',
    },
    ...overrides,
  };
}

function createOrderRecord() {
  return {
    id: 'order-1',
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
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    buyerShop: null,
    paymentIntent: null,
    escrow: null,
    disputes: [],
    items: [
      {
        id: 'order-item-1',
        offerTitleSnapshot: 'Serum chong gia',
      },
    ],
  };
}
