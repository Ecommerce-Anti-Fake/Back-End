import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { GetSellerAffiliateSummaryUseCase } from './get-seller-affiliate-summary.use-case';

describe('GetSellerAffiliateSummaryUseCase', () => {
  let useCase: GetSellerAffiliateSummaryUseCase;

  const repositoryMock = {
    findOwnedProgramById: jest.fn(),
    getSellerAffiliateSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetSellerAffiliateSummaryUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get(GetSellerAffiliateSummaryUseCase);
  });

  it('returns authoritative all-time money aggregates as decimal strings', async () => {
    repositoryMock.getSellerAffiliateSummary.mockResolvedValueOnce({
      programCount: 4,
      activeProgramCount: 3,
      memberCount: 28,
      conversionCount: 41,
      commissionTotals: [
        { commissionStatus: 'PENDING', amount: new Prisma.Decimal('12000.50') },
        { commissionStatus: 'LOCKED', amount: new Prisma.Decimal('30000') },
        { commissionStatus: 'PAID', amount: new Prisma.Decimal('90000') },
      ],
    });

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      programId: null,
    });

    expect(result).toEqual({
      programCount: 4,
      activeProgramCount: 3,
      memberCount: 28,
      conversionCount: 41,
      pendingCommissionAmount: '12000.5',
      approvedCommissionAmount: '0',
      lockedCommissionAmount: '30000',
      paidCommissionAmount: '90000',
      cancelledCommissionAmount: '0',
      currency: 'VND',
    });
  });

  it('rejects a selected program not owned by the requester', async () => {
    repositoryMock.findOwnedProgramById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        requesterUserId: 'seller-1',
        programId: 'program-other-shop',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(repositoryMock.getSellerAffiliateSummary).not.toHaveBeenCalled();
  });
});
