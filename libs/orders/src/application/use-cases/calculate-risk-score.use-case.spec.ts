import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CalculateRiskScoreUseCase } from './calculate-risk-score.use-case';

describe('CalculateRiskScoreUseCase', () => {
  let useCase: CalculateRiskScoreUseCase;

  const ordersRepositoryMock = {
    getRiskSignals: jest.fn(),
    findRiskScoreByTarget: jest.fn(),
    findModerationCaseByTarget: jest.fn(),
    saveRiskScore: jest.fn(),
    upsertRiskModerationCase: jest.fn(),
    createAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalculateRiskScoreUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<CalculateRiskScoreUseCase>(CalculateRiskScoreUseCase);
  });

  it('calculates high risk from reports, disputes, rejected docs, and missing provenance', async () => {
    ordersRepositoryMock.getRiskSignals.mockResolvedValueOnce({
      targetType: 'OFFER',
      targetId: 'offer-1',
      targetLabel: 'Kem chong nang',
      openReportCount: 1,
      resolvedReportCount: 1,
      rejectedReportCount: 0,
      openDisputeCount: 1,
      refundedDisputeCount: 0,
      rejectedDocumentCount: 1,
      pendingDocumentCount: 0,
      missingProvenance: true,
      reviewCount: 3,
      averageRating: 2.5,
    });
    ordersRepositoryMock.findRiskScoreByTarget.mockResolvedValueOnce(null);
    ordersRepositoryMock.findModerationCaseByTarget.mockResolvedValueOnce(null);
    ordersRepositoryMock.saveRiskScore.mockImplementationOnce(async (input) => ({
      id: 'risk-1',
      targetType: input.targetType,
      targetId: input.targetId,
      score: new Prisma.Decimal(input.score),
      riskLevel: input.riskLevel,
      factorSummary: input.factorSummary,
      calculatedAt: input.calculatedAt,
    }));
    ordersRepositoryMock.upsertRiskModerationCase.mockResolvedValueOnce({
      id: 'case-1',
      targetType: 'OFFER',
      targetId: 'offer-1',
      caseStatus: 'ESCALATED',
    });

    const result = await useCase.execute({ targetType: 'OFFER', targetId: 'offer-1', actorUserId: 'admin-1' });

    expect(ordersRepositoryMock.saveRiskScore).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'OFFER',
        targetId: 'offer-1',
        score: 96,
        riskLevel: 'CRITICAL',
      }),
    );
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'OFFER',
        targetId: 'offer-1',
        actorUserId: 'admin-1',
        action: 'RISK_SCORE_RECALCULATED',
        toStatus: 'CRITICAL',
      }),
    );
    expect(ordersRepositoryMock.upsertRiskModerationCase).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'OFFER',
        targetId: 'offer-1',
        riskLevel: 'CRITICAL',
        score: 96,
      }),
    );
    expect(ordersRepositoryMock.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: 'OFFER',
        targetId: 'offer-1',
        action: 'MODERATION_CASE_AUTOMATED',
        toStatus: 'ESCALATED',
      }),
    );
    expect(result).toMatchObject({
      id: 'risk-1',
      targetType: 'OFFER',
      riskLevel: 'CRITICAL',
      targetLabel: 'Kem chong nang',
    });
    expect(result.factors.map((factor) => factor.key)).toEqual(
      expect.arrayContaining(['openReports', 'openDisputes', 'rejectedDocuments', 'missingProvenance', 'lowRating']),
    );
  });

  it('does not write audit when score and level are unchanged', async () => {
    ordersRepositoryMock.getRiskSignals.mockResolvedValueOnce({
      targetType: 'SHOP',
      targetId: 'shop-1',
      targetLabel: 'Shop ABC',
      openReportCount: 0,
      resolvedReportCount: 0,
      rejectedReportCount: 0,
      openDisputeCount: 0,
      refundedDisputeCount: 0,
      rejectedDocumentCount: 0,
      pendingDocumentCount: 0,
      missingProvenance: false,
      reviewCount: 0,
      averageRating: null,
    });
    ordersRepositoryMock.findRiskScoreByTarget.mockResolvedValueOnce({
      id: 'risk-1',
      score: new Prisma.Decimal(0),
      riskLevel: 'LOW',
    });
    ordersRepositoryMock.saveRiskScore.mockImplementationOnce(async (input) => ({
      id: 'risk-1',
      targetType: input.targetType,
      targetId: input.targetId,
      score: new Prisma.Decimal(input.score),
      riskLevel: input.riskLevel,
      factorSummary: input.factorSummary,
      calculatedAt: input.calculatedAt,
    }));

    await useCase.execute({ targetType: 'SHOP', targetId: 'shop-1', actorUserId: 'admin-1' });

    expect(ordersRepositoryMock.createAuditLog).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.upsertRiskModerationCase).not.toHaveBeenCalled();
  });
});
