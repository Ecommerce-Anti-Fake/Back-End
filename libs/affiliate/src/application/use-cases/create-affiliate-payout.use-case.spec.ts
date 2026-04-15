import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { CreateAffiliatePayoutUseCase } from './create-affiliate-payout.use-case';

describe('CreateAffiliatePayoutUseCase', () => {
  let useCase: CreateAffiliatePayoutUseCase;

  const repositoryMock = {
    findOwnedProgramById: jest.fn(),
    findOwnedAccountInProgram: jest.fn(),
    findApprovedLedgerEntriesForPayout: jest.fn(),
    createPayout: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAffiliatePayoutUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateAffiliatePayoutUseCase>(CreateAffiliatePayoutUseCase);
  });

  it('should create payout from approved ledger entries', async () => {
    repositoryMock.findOwnedProgramById.mockResolvedValueOnce({ id: 'program-1' });
    repositoryMock.findOwnedAccountInProgram.mockResolvedValueOnce({ id: 'account-1', programId: 'program-1' });
    repositoryMock.findApprovedLedgerEntriesForPayout.mockResolvedValueOnce([
      { id: 'ledger-1', amount: new Prisma.Decimal(20000) },
      { id: 'ledger-2', amount: new Prisma.Decimal(15000) },
    ]);
    repositoryMock.createPayout.mockResolvedValueOnce({
      id: 'payout-1',
      programId: 'program-1',
      accountId: 'account-1',
      periodStart: new Date('2026-04-01T00:00:00.000Z'),
      periodEnd: new Date('2026-04-30T23:59:59.999Z'),
      totalAmount: new Prisma.Decimal(35000),
      payoutStatus: 'PENDING',
      externalRef: 'batch-1',
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'owner-1',
      programId: 'program-1',
      accountId: 'account-1',
      periodStart: '2026-04-01T00:00:00.000Z',
      periodEnd: '2026-04-30T23:59:59.999Z',
      externalRef: 'batch-1',
    });

    expect(repositoryMock.createPayout).toHaveBeenCalledWith({
      programId: 'program-1',
      accountId: 'account-1',
      periodStart: new Date('2026-04-01T00:00:00.000Z'),
      periodEnd: new Date('2026-04-30T23:59:59.999Z'),
      totalAmount: 35000,
      externalRef: 'batch-1',
      ledgerEntryIds: ['ledger-1', 'ledger-2'],
    });
    expect(result).toMatchObject({
      id: 'payout-1',
      totalAmount: 35000,
      payoutStatus: 'PENDING',
    });
  });
});
