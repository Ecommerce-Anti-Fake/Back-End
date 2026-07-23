import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListAffiliateProgramCommissionsUseCase } from './list-affiliate-program-commissions.use-case';

describe('ListAffiliateProgramCommissionsUseCase', () => {
  let useCase: ListAffiliateProgramCommissionsUseCase;

  const repositoryMock = {
    findOwnedProgramById: jest.fn(),
    findProgramCommissionEntries: jest.fn(),
    countProgramCommissionEntries: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListAffiliateProgramCommissionsUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get(ListAffiliateProgramCommissionsUseCase);
  });

  it('returns paginated money-safe reconciliation rows for the program owner', async () => {
    repositoryMock.findOwnedProgramById.mockResolvedValueOnce({ id: 'program-1' });
    repositoryMock.countProgramCommissionEntries.mockResolvedValueOnce(1);
    repositoryMock.findProgramCommissionEntries.mockResolvedValueOnce([
      {
        id: 'commission-1',
        conversionId: 'conversion-1',
        beneficiaryAccountId: 'account-1',
        tierLevel: 1,
        amount: new Prisma.Decimal('12500.25'),
        currency: 'VND',
        commissionStatus: 'LOCKED',
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        lockedAt: new Date('2026-07-21T00:00:00.000Z'),
        availableAt: new Date('2026-07-28T00:00:00.000Z'),
        paidAt: null,
        payoutId: null,
        beneficiaryAccount: { user: { displayName: 'Minh Anh' } },
        conversion: {
          orderId: 'order-1',
          recordedAt: new Date('2026-07-20T00:00:00.000Z'),
          approvedAt: new Date('2026-07-21T00:00:00.000Z'),
        },
        payout: null,
      },
    ]);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      programId: 'program-1',
      page: 1,
      pageSize: 20,
      status: 'LOCKED',
      tierLevel: 1,
    });

    expect(result.items[0]).toMatchObject({
      id: 'commission-1',
      orderId: 'order-1',
      memberDisplayName: 'Minh Anh',
      tierLevel: 1,
      amount: '12500.25',
      commissionStatus: 'LOCKED',
    });
    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });

  it('does not expose commissions from a program owned by another seller', async () => {
    repositoryMock.findOwnedProgramById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        requesterUserId: 'seller-1',
        programId: 'program-other-shop',
        page: 1,
        pageSize: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repositoryMock.findProgramCommissionEntries).not.toHaveBeenCalled();
  });
});
