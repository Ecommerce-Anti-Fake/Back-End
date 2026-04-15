import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ApproveAffiliateConversionUseCase } from './approve-affiliate-conversion.use-case';

describe('ApproveAffiliateConversionUseCase', () => {
  let useCase: ApproveAffiliateConversionUseCase;

  const repositoryMock = {
    findOwnedConversionById: jest.fn(),
    approveConversion: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApproveAffiliateConversionUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ApproveAffiliateConversionUseCase>(ApproveAffiliateConversionUseCase);
  });

  it('should approve a pending conversion', async () => {
    repositoryMock.findOwnedConversionById.mockResolvedValueOnce({
      id: 'conversion-1',
      programId: 'program-1',
      conversionStatus: 'PENDING',
    });
    repositoryMock.approveConversion.mockResolvedValueOnce({
      id: 'conversion-1',
      programId: 'program-1',
      orderId: 'order-1',
      offerId: 'offer-1',
      affiliateCodeId: 'code-1',
      tier1AccountId: 'account-1',
      tier2AccountId: 'account-2',
      customerUserId: 'buyer-1',
      conversionStatus: 'APPROVED',
      orderAmount: new Prisma.Decimal(200000),
      commissionBase: new Prisma.Decimal(40000),
      recordedAt: new Date('2026-04-14T10:00:00.000Z'),
      approvedAt: new Date('2026-04-15T10:00:00.000Z'),
      commissionEntries: [],
    });

    const result = await useCase.execute({
      requesterUserId: 'owner-1',
      conversionId: 'conversion-1',
    });

    expect(repositoryMock.approveConversion).toHaveBeenCalledWith('conversion-1');
    expect(result).toMatchObject({
      id: 'conversion-1',
      conversionStatus: 'APPROVED',
      commissionBase: 40000,
    });
  });
});
