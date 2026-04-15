import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { UpdateAffiliatePayoutStatusUseCase } from './update-affiliate-payout-status.use-case';

describe('UpdateAffiliatePayoutStatusUseCase', () => {
  let useCase: UpdateAffiliatePayoutStatusUseCase;

  const repositoryMock = {
    findOwnedPayoutById: jest.fn(),
    updatePayoutStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateAffiliatePayoutStatusUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<UpdateAffiliatePayoutStatusUseCase>(UpdateAffiliatePayoutStatusUseCase);
  });

  it('should update payout status to paid', async () => {
    repositoryMock.findOwnedPayoutById.mockResolvedValueOnce({
      id: 'payout-1',
      payoutStatus: 'PENDING',
    });
    repositoryMock.updatePayoutStatus.mockResolvedValueOnce({
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
    });

    const result = await useCase.execute({
      requesterUserId: 'owner-1',
      payoutId: 'payout-1',
      payoutStatus: 'PAID',
    });

    expect(repositoryMock.updatePayoutStatus).toHaveBeenCalledWith({
      payoutId: 'payout-1',
      payoutStatus: 'PAID',
    });
    expect(result).toMatchObject({
      id: 'payout-1',
      payoutStatus: 'PAID',
      totalAmount: 35000,
    });
  });

  it('should reject updates for terminal payout status', async () => {
    repositoryMock.findOwnedPayoutById.mockResolvedValueOnce({
      id: 'payout-1',
      payoutStatus: 'PAID',
    });

    await expect(
      useCase.execute({
        requesterUserId: 'owner-1',
        payoutId: 'payout-1',
        payoutStatus: 'FAILED',
      }),
    ).rejects.toThrow('Terminal payout status cannot be changed');
  });
});
