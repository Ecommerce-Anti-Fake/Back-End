import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { RejectAffiliateConversionUseCase } from './reject-affiliate-conversion.use-case';

describe('RejectAffiliateConversionUseCase', () => {
  let useCase: RejectAffiliateConversionUseCase;

  const repositoryMock = {
    findOwnedConversionById: jest.fn(),
    rejectConversion: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RejectAffiliateConversionUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<RejectAffiliateConversionUseCase>(RejectAffiliateConversionUseCase);
  });

  it('should reject a pending conversion', async () => {
    repositoryMock.findOwnedConversionById.mockResolvedValueOnce({
      id: 'conversion-1',
      programId: 'program-1',
      conversionStatus: 'PENDING',
    });
    repositoryMock.rejectConversion.mockResolvedValueOnce({
      id: 'conversion-1',
      programId: 'program-1',
      orderId: 'order-1',
      offerId: 'offer-1',
      affiliateCodeId: 'code-1',
      tier1AccountId: 'account-1',
      tier2AccountId: null,
      customerUserId: 'buyer-1',
      conversionStatus: 'REJECTED',
      orderAmount: new Prisma.Decimal(200000),
      commissionBase: new Prisma.Decimal(40000),
      recordedAt: new Date('2026-04-14T10:00:00.000Z'),
      approvedAt: null,
      commissionEntries: [],
    });

    const result = await useCase.execute({
      requesterUserId: 'owner-1',
      conversionId: 'conversion-1',
    });

    expect(repositoryMock.rejectConversion).toHaveBeenCalledWith('conversion-1');
    expect(result).toMatchObject({
      id: 'conversion-1',
      conversionStatus: 'REJECTED',
    });
  });
});
