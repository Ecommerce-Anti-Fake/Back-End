import { Test, TestingModule } from '@nestjs/testing';
import { CreateAffiliateProgramUseCase } from './create-affiliate-program.use-case';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { Prisma } from '@prisma/client';

describe('CreateAffiliateProgramUseCase', () => {
  let useCase: CreateAffiliateProgramUseCase;

  const repositoryMock = {
    findProgramBySlug: jest.fn(),
    findOwnedShop: jest.fn(),
    findBrandById: jest.fn(),
    findProductModelById: jest.fn(),
    findOwnedOffer: jest.fn(),
    createProgram: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAffiliateProgramUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateAffiliateProgramUseCase>(CreateAffiliateProgramUseCase);
  });

  it('should create a shop-scoped affiliate program', async () => {
    repositoryMock.findProgramBySlug.mockResolvedValueOnce(null);
    repositoryMock.findOwnedShop.mockResolvedValueOnce({ id: 'shop-1' });
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
        commissionModel: 'revenue_share',
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
});

function createProgramRecord() {
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
    commissionModel: 'revenue_share',
    tier1Rate: new Prisma.Decimal(12),
    tier2Rate: new Prisma.Decimal(5),
    startedAt: null,
    endedAt: null,
    createdAt: new Date('2026-04-14T10:00:00.000Z'),
    ownerShop: { shopName: 'Main Shop' },
    brand: null,
    productModel: null,
    offer: null,
  };
}
