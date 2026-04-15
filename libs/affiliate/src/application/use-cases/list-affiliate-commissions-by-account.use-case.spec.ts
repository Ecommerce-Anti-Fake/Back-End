import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListAffiliateCommissionsByAccountUseCase } from './list-affiliate-commissions-by-account.use-case';

describe('ListAffiliateCommissionsByAccountUseCase', () => {
  let useCase: ListAffiliateCommissionsByAccountUseCase;

  const repositoryMock = {
    findOwnedAffiliateAccount: jest.fn(),
    findCommissionEntriesByAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAffiliateCommissionsByAccountUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ListAffiliateCommissionsByAccountUseCase>(ListAffiliateCommissionsByAccountUseCase);
  });

  it('should return commission entries for account owner', async () => {
    repositoryMock.findOwnedAffiliateAccount.mockResolvedValueOnce({
      id: 'account-1',
      programId: 'program-1',
      program: { name: 'Spring Program' },
    });
    repositoryMock.findCommissionEntriesByAccount.mockResolvedValueOnce([
      {
        id: 'ledger-1',
        conversionId: 'conversion-1',
        payoutId: null,
        beneficiaryType: 'AFFILIATE_TIER_1',
        tierLevel: 1,
        amount: new Prisma.Decimal(12000),
        commissionStatus: 'PENDING',
        currency: 'VND',
        createdAt: new Date('2026-04-14T10:00:00.000Z'),
        paidAt: null,
        lockedAt: null,
      },
    ]);

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      accountId: 'account-1',
    });

    expect(result).toMatchObject([
      {
        id: 'ledger-1',
        conversionId: 'conversion-1',
        amount: 12000,
        commissionStatus: 'PENDING',
        beneficiaryType: 'AFFILIATE_TIER_1',
      },
    ]);
  });
});
