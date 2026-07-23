import { Test, TestingModule } from '@nestjs/testing';
import { CreateAffiliateProgramUseCase } from './create-affiliate-program.use-case';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

describe('CreateAffiliateProgramUseCase', () => {
  let useCase: CreateAffiliateProgramUseCase;

  const repositoryMock = {
    findProgramBySlug: jest.fn(),
    findOwnedShop: jest.fn(),
    findOwnedOffer: jest.fn(),
    createProgram: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    configServiceMock.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAffiliateProgramUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    useCase = module.get<CreateAffiliateProgramUseCase>(CreateAffiliateProgramUseCase);
  });

  it('should create a shop-scoped affiliate program', async () => {
    repositoryMock.findProgramBySlug.mockResolvedValueOnce(null);
    repositoryMock.findOwnedShop.mockResolvedValueOnce({ id: 'shop-1', shopStatus: 'verified' });
    repositoryMock.createProgram.mockResolvedValueOnce(createProgramRecord());

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      ownerShopId: 'shop-1',
      scopeType: 'SHOP',
      name: '  Spring Program  ',
      slug: 'spring-program',
      tier1Rate: 12,
      tier2Rate: 5,
    });

    expect(repositoryMock.createProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerShopId: 'shop-1',
        scopeType: 'SHOP',
        name: 'Spring Program',
        slug: 'spring-program',
        attributionWindowDays: 30,
        commissionHoldDays: 7,
        commissionModel: 'revenue_share',
        settlementMode: 'AUTOMATIC',
      }),
    );
    expect(result).toMatchObject({
      id: 'program-1',
      scopeType: 'SHOP',
      name: 'Spring Program',
      tier1Rate: 12,
      tier2Rate: 5,
    });
  });

  it('generates a unique slug and uses the system commission hold policy', async () => {
    configServiceMock.get.mockReturnValueOnce('14');
    repositoryMock.findProgramBySlug
      .mockResolvedValueOnce({ id: 'existing-program' })
      .mockResolvedValueOnce(null);
    repositoryMock.findOwnedShop.mockResolvedValueOnce({ id: 'shop-1', shopStatus: 'verified' });
    repositoryMock.createProgram.mockImplementationOnce((data) =>
      Promise.resolve(createProgramRecord({
        slug: data.slug,
        commissionHoldDays: data.commissionHoldDays,
      })),
    );

    const legacyPayload = {
      requesterUserId: 'user-1',
      ownerShopId: 'shop-1',
      scopeType: 'SHOP' as const,
      name: 'Chiến dịch Mùa Hè',
      tier1Rate: 12,
      tier2Rate: 5,
      commissionHoldDays: 1,
    };
    await useCase.execute(legacyPayload);

    expect(repositoryMock.findProgramBySlug).toHaveBeenNthCalledWith(1, 'chien-dich-mua-he');
    expect(repositoryMock.findProgramBySlug).toHaveBeenNthCalledWith(2, 'chien-dich-mua-he-2');
    expect(repositoryMock.createProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'chien-dich-mua-he-2',
        commissionHoldDays: 14,
      }),
    );
  });

  it('rejects an invalid system commission hold policy', async () => {
    configServiceMock.get.mockReturnValueOnce('0');

    await expect(useCase.execute({
      requesterUserId: 'user-1',
      ownerShopId: 'shop-1',
      scopeType: 'SHOP',
      name: 'Spring Program',
      tier1Rate: 12,
      tier2Rate: 5,
    })).rejects.toThrow(
      'AFFILIATE_COMMISSION_HOLD_DAYS must be an integer between 1 and 30',
    );

    expect(repositoryMock.createProgram).not.toHaveBeenCalled();
  });

  it('should reject when tier 2 rate is greater than tier 1 rate', async () => {
    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        ownerShopId: 'shop-1',
        scopeType: 'SHOP',
        name: 'Spring Program',
        slug: 'spring-program',
        tier1Rate: 5,
        tier2Rate: 10,
      }),
    ).rejects.toThrow('Tier 2 rate cannot be greater than tier 1 rate');
  });

  it('rejects a program for an owned shop that is not verified', async () => {
    repositoryMock.findProgramBySlug.mockResolvedValueOnce(null);
    repositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'shop-1',
      shopStatus: 'pending_verification',
    });

    await expect(useCase.execute({
      requesterUserId: 'user-1',
      ownerShopId: 'shop-1',
      scopeType: 'SHOP',
      name: 'Pending Shop Program',
      slug: 'pending-shop-program',
      tier1Rate: 6,
      tier2Rate: 2,
    })).rejects.toThrow('Owner shop must be verified');

    expect(repositoryMock.createProgram).not.toHaveBeenCalled();
  });

  it('rejects programs whose combined tier rates exceed the commission base', async () => {
    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        ownerShopId: 'shop-1',
        scopeType: 'SHOP',
        name: 'Unsafe Program',
        slug: 'unsafe-program',
        tier1Rate: 70,
        tier2Rate: 40,
      }),
    ).rejects.toThrow('Combined affiliate rates cannot exceed 100 percent');

    expect(repositoryMock.createProgram).not.toHaveBeenCalled();
  });

  it('should reject product-model scoped affiliate programs', async () => {
    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        ownerShopId: 'shop-1',
        productModelId: 'model-1',
        scopeType: 'PRODUCT_MODEL',
        name: 'Model Program',
        slug: 'model-program',
        tier1Rate: 10,
        tier2Rate: 5,
      }),
    ).rejects.toThrow('PRODUCT_MODEL affiliate scope is removed');

    expect(repositoryMock.createProgram).not.toHaveBeenCalled();
  });

  it('rejects creating a new brand-scoped program', async () => {
    const legacyBrandPayload = {
      requesterUserId: 'user-1',
      ownerShopId: 'shop-1',
      brandId: 'brand-1',
      scopeType: 'BRAND' as const,
      name: 'Brand Program',
      slug: 'brand-program',
      tier1Rate: 6,
      tier2Rate: 2,
    };
    await expect(useCase.execute(legacyBrandPayload)).rejects.toThrow(
      'New affiliate programs only support SHOP or OFFER scope',
    );

    expect(repositoryMock.createProgram).not.toHaveBeenCalled();
  });

  it('creates an offer-scoped program for an active owned offer', async () => {
    repositoryMock.findProgramBySlug.mockResolvedValueOnce(null);
    repositoryMock.findOwnedShop.mockResolvedValueOnce({ id: 'shop-1', shopStatus: 'verified' });
    repositoryMock.findOwnedOffer.mockResolvedValueOnce({ id: 'offer-1', shopId: 'shop-1' });
    repositoryMock.createProgram.mockResolvedValueOnce(createProgramRecord({
      scopeType: 'OFFER',
      offerId: 'offer-1',
    }));

    await useCase.execute({
      requesterUserId: 'user-1',
      ownerShopId: 'shop-1',
      offerId: 'offer-1',
      scopeType: 'OFFER',
      name: 'Offer Program',
      tier1Rate: 6,
      tier2Rate: 2,
    });

    expect(repositoryMock.createProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeType: 'OFFER',
        offerId: 'offer-1',
        brandId: null,
      }),
    );
  });
});

function createProgramRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'program-1',
    ownerShopId: 'shop-1',
    brandId: null,
    productModelId: null,
    offerId: null,
    scopeType: 'SHOP',
    name: 'Spring Program',
    slug: 'spring-program',
    programStatus: 'ACTIVE',
    attributionWindowDays: 30,
    commissionHoldDays: 7,
    commissionModel: 'revenue_share',
    settlementMode: 'AUTOMATIC',
    tier1Rate: new Prisma.Decimal(12),
    tier2Rate: new Prisma.Decimal(5),
    startedAt: null,
    endedAt: null,
    createdAt: new Date('2026-04-14T10:00:00.000Z'),
    ownerShop: { shopName: 'Main Shop' },
    brand: null,
    productModel: null,
    offer: null,
    ...overrides,
  };
}
