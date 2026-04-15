import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListAffiliatePayoutsByAccountUseCase } from './list-affiliate-payouts-by-account.use-case';

describe('ListAffiliatePayoutsByAccountUseCase', () => {
  let useCase: ListAffiliatePayoutsByAccountUseCase;

  const repositoryMock = {
    findOwnedAffiliateAccount: jest.fn(),
    findPayoutsByAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAffiliatePayoutsByAccountUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ListAffiliatePayoutsByAccountUseCase>(ListAffiliatePayoutsByAccountUseCase);
  });

  it('should return payouts for account owner', async () => {
    repositoryMock.findOwnedAffiliateAccount.mockResolvedValueOnce({
      id: 'account-1',
      programId: 'program-1',
      program: { name: 'Spring Program' },
    });
    repositoryMock.findPayoutsByAccount.mockResolvedValueOnce([
      {
        id: 'payout-1',
        programId: 'program-1',
        accountId: 'account-1',
        periodStart: new Date('2026-04-01T00:00:00.000Z'),
        periodEnd: new Date('2026-04-30T23:59:59.999Z'),
        totalAmount: new Prisma.Decimal(35000),
        payoutStatus: 'PAID',
        externalRef: 'batch-1',
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        updatedAt: new Date('2026-05-02T10:00:00.000Z'),
      },
    ]);

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      accountId: 'account-1',
    });

    expect(result).toMatchObject([
      {
        id: 'payout-1',
        payoutStatus: 'PAID',
        totalAmount: 35000,
      },
    ]);
  });
});
