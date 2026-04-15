import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { GetAffiliateAccountSummaryUseCase } from './get-affiliate-account-summary.use-case';

describe('GetAffiliateAccountSummaryUseCase', () => {
  let useCase: GetAffiliateAccountSummaryUseCase;

  const repositoryMock = {
    findOwnedAffiliateAccount: jest.fn(),
    getAffiliateAccountSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAffiliateAccountSummaryUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<GetAffiliateAccountSummaryUseCase>(GetAffiliateAccountSummaryUseCase);
  });

  it('should aggregate conversion counts and commission totals for account owner', async () => {
    repositoryMock.findOwnedAffiliateAccount.mockResolvedValueOnce({
      id: 'account-1',
      programId: 'program-1',
      program: { name: 'Spring Program' },
    });
    repositoryMock.getAffiliateAccountSummary.mockResolvedValueOnce({
      account: { id: 'account-1', programId: 'program-1', program: { name: 'Spring Program' } },
      conversions: [
        { id: 'c1', tier1AccountId: 'account-1', tier2AccountId: null },
        { id: 'c2', tier1AccountId: 'other-account', tier2AccountId: 'account-1' },
      ],
      commissionEntries: [
        { amount: new Prisma.Decimal(10000), commissionStatus: 'PENDING' },
        { amount: new Prisma.Decimal(20000), commissionStatus: 'PAID' },
        { amount: new Prisma.Decimal(5000), commissionStatus: 'APPROVED' },
      ],
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      accountId: 'account-1',
    });

    expect(result).toMatchObject({
      accountId: 'account-1',
      programId: 'program-1',
      programName: 'Spring Program',
      totalConversions: 2,
      totalTier1Conversions: 1,
      totalTier2Conversions: 1,
      totalCommissionAmount: 35000,
      pendingCommissionAmount: 10000,
      approvedCommissionAmount: 5000,
      paidCommissionAmount: 20000,
    });
  });
});
