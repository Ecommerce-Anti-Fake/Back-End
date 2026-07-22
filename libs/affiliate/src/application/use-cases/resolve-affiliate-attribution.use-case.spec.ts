import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ResolveAffiliateAttributionUseCase } from './resolve-affiliate-attribution.use-case';

describe('ResolveAffiliateAttributionUseCase', () => {
  const repository = { findAffiliateAttributionByCode: jest.fn() };
  let useCase: ResolveAffiliateAttributionUseCase;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ResolveAffiliateAttributionUseCase,
        { provide: AffiliateRepository, useValue: repository },
      ],
    }).compile();
    useCase = module.get(ResolveAffiliateAttributionUseCase);
  });

  it('resolves an active code and caps expiry at the program window', async () => {
    const now = new Date('2026-07-22T10:00:00.000Z');
    repository.findAffiliateAttributionByCode.mockResolvedValue({
      code: 'seller-01',
      expiresAt: new Date('2026-08-30T00:00:00.000Z'),
      account: { accountStatus: 'ACTIVE' },
      program: {
        id: 'program-1',
        programStatus: 'ACTIVE',
        attributionWindowDays: 7,
        startedAt: null,
        endedAt: null,
      },
    });

    await expect(useCase.execute({ code: ' SELLER-01 ', now })).resolves.toEqual({
      code: 'seller-01',
      programId: 'program-1',
      expiresAt: new Date('2026-07-29T10:00:00.000Z'),
    });
  });

  it.each([
    ['missing', null],
    [
      'inactive account',
      {
        code: 'seller-01',
        expiresAt: null,
        account: { accountStatus: 'SUSPENDED' },
        program: {
          id: 'program-1',
          programStatus: 'ACTIVE',
          attributionWindowDays: 7,
          startedAt: null,
          endedAt: null,
        },
      },
    ],
  ])('rejects %s attribution', async (_case, attribution) => {
    repository.findAffiliateAttributionByCode.mockResolvedValue(attribution);

    await expect(
      useCase.execute({ code: 'seller-01', now: new Date('2026-07-22T10:00:00.000Z') }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
