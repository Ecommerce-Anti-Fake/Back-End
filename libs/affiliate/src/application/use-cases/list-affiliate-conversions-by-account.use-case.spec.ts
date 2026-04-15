import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListAffiliateConversionsByAccountUseCase } from './list-affiliate-conversions-by-account.use-case';

describe('ListAffiliateConversionsByAccountUseCase', () => {
  let useCase: ListAffiliateConversionsByAccountUseCase;

  const repositoryMock = {
    findOwnedAffiliateAccount: jest.fn(),
    findConversionsByAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAffiliateConversionsByAccountUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ListAffiliateConversionsByAccountUseCase>(ListAffiliateConversionsByAccountUseCase);
  });

  it('should return conversions for account owner', async () => {
    repositoryMock.findOwnedAffiliateAccount.mockResolvedValueOnce({
      id: 'account-1',
      programId: 'program-1',
      program: { name: 'Spring Program' },
    });
    repositoryMock.findConversionsByAccount.mockResolvedValueOnce([
      {
        id: 'conversion-1',
        programId: 'program-1',
        orderId: 'order-1',
        offerId: 'offer-1',
        affiliateCodeId: 'code-1',
        tier1AccountId: 'account-1',
        tier2AccountId: null,
        customerUserId: 'buyer-1',
        conversionStatus: 'APPROVED',
        orderAmount: new Prisma.Decimal(200000),
        commissionBase: new Prisma.Decimal(40000),
        recordedAt: new Date('2026-04-14T10:00:00.000Z'),
        approvedAt: new Date('2026-04-15T10:00:00.000Z'),
        commissionEntries: [],
      },
    ]);

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      accountId: 'account-1',
    });

    expect(result).toMatchObject([
      {
        id: 'conversion-1',
        conversionStatus: 'APPROVED',
        commissionBase: 40000,
      },
    ]);
  });
});
