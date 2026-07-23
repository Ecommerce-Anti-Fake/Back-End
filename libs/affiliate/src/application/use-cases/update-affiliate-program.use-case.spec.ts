import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { UpdateAffiliateProgramUseCase } from './update-affiliate-program.use-case';

describe('UpdateAffiliateProgramUseCase', () => {
  let useCase: UpdateAffiliateProgramUseCase;

  const repositoryMock = {
    findOwnedProgramForUpdate: jest.fn(),
    findOwnedOffer: jest.fn(),
    updateProgram: jest.fn(),
  };

  const activeProgram = {
    id: 'program-1',
    ownerShopId: 'shop-1',
    scopeType: 'SHOP',
    offerId: null,
    name: 'Creators',
    programStatus: 'ACTIVE',
    attributionWindowDays: 30,
    tier1Rate: new Prisma.Decimal(6),
    tier2Rate: new Prisma.Decimal(2),
    startedAt: null,
    endedAt: null,
    _count: { accounts: 2, conversions: 0 },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateAffiliateProgramUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get(UpdateAffiliateProgramUseCase);
  });

  it('rejects commercial configuration changes after the first member joins', async () => {
    repositoryMock.findOwnedProgramForUpdate.mockResolvedValueOnce(activeProgram);

    await expect(
      useCase.execute({
        requesterUserId: 'seller-1',
        programId: 'program-1',
        tier1Rate: 8,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repositoryMock.updateProgram).not.toHaveBeenCalled();
  });

  it('allows a locked program to change its name, schedule, and status', async () => {
    repositoryMock.findOwnedProgramForUpdate.mockResolvedValueOnce(activeProgram);
    repositoryMock.updateProgram.mockResolvedValueOnce({
      ...activeProgram,
      name: 'Creators paused',
      programStatus: 'PAUSED',
      endedAt: new Date('2026-12-31T00:00:00.000Z'),
      ownerShop: { shopName: 'AntiFake Shop' },
      brandId: null,
      brand: null,
      offer: null,
      slug: 'creators',
      commissionHoldDays: 7,
      commissionModel: 'revenue_share',
      settlementMode: 'AUTOMATIC',
      createdAt: new Date('2026-07-23T00:00:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      programId: 'program-1',
      name: 'Creators paused',
      programStatus: 'PAUSED',
      endedAt: '2026-12-31T00:00:00.000Z',
    });

    expect(repositoryMock.updateProgram).toHaveBeenCalledWith(
      'program-1',
      expect.objectContaining({
        name: 'Creators paused',
        programStatus: 'PAUSED',
        endedAt: new Date('2026-12-31T00:00:00.000Z'),
      }),
    );
    expect(result).toMatchObject({
      name: 'Creators paused',
      programStatus: 'PAUSED',
      configurationLocked: true,
    });
  });

  it('permits full configuration edits before members and conversions exist', async () => {
    repositoryMock.findOwnedProgramForUpdate.mockResolvedValueOnce({
      ...activeProgram,
      _count: { accounts: 0, conversions: 0 },
    });
    repositoryMock.findOwnedOffer.mockResolvedValueOnce({
      id: 'offer-1',
      shopId: 'shop-1',
    });
    repositoryMock.updateProgram.mockResolvedValueOnce({
      ...activeProgram,
      scopeType: 'OFFER',
      offerId: 'offer-1',
      tier1Rate: new Prisma.Decimal(8),
      tier2Rate: new Prisma.Decimal(3),
      ownerShop: { shopName: 'AntiFake Shop' },
      brandId: null,
      brand: null,
      offer: { title: 'Verified offer', modelName: null },
      slug: 'creators',
      commissionHoldDays: 7,
      commissionModel: 'revenue_share',
      settlementMode: 'AUTOMATIC',
      createdAt: new Date('2026-07-23T00:00:00.000Z'),
      _count: { accounts: 0, conversions: 0 },
    });

    await useCase.execute({
      requesterUserId: 'seller-1',
      programId: 'program-1',
      scopeType: 'OFFER',
      offerId: 'offer-1',
      tier1Rate: 8,
      tier2Rate: 3,
    });

    expect(repositoryMock.updateProgram).toHaveBeenCalledWith(
      'program-1',
      expect.objectContaining({
        scopeType: 'OFFER',
        offerId: 'offer-1',
        tier1Rate: 8,
        tier2Rate: 3,
      }),
    );
  });
});
