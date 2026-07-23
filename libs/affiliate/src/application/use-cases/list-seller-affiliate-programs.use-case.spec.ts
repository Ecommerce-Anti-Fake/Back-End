import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListSellerAffiliateProgramsUseCase } from './list-seller-affiliate-programs.use-case';

describe('ListSellerAffiliateProgramsUseCase', () => {
  let useCase: ListSellerAffiliateProgramsUseCase;

  const repositoryMock = {
    findSellerPrograms: jest.fn(),
    countSellerPrograms: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSellerAffiliateProgramsUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get(ListSellerAffiliateProgramsUseCase);
  });

  it('returns paginated programs with server-owned edit lock metadata', async () => {
    repositoryMock.findSellerPrograms.mockResolvedValueOnce([
      {
        id: 'program-1',
        ownerShopId: 'shop-1',
        ownerShop: { shopName: 'AntiFake Shop' },
        brandId: null,
        brand: null,
        offerId: null,
        offer: null,
        scopeType: 'SHOP',
        name: 'Summer creators',
        slug: 'summer-creators',
        programStatus: 'ACTIVE',
        attributionWindowDays: 30,
        commissionHoldDays: 7,
        commissionModel: 'revenue_share',
        settlementMode: 'AUTOMATIC',
        tier1Rate: new Prisma.Decimal(6),
        tier2Rate: new Prisma.Decimal(2),
        startedAt: null,
        endedAt: null,
        createdAt: new Date('2026-07-23T00:00:00.000Z'),
        _count: { accounts: 3, conversions: 8 },
      },
    ]);
    repositoryMock.countSellerPrograms.mockResolvedValueOnce(1);

    const result = await useCase.execute({
      requesterUserId: 'seller-1',
      page: 1,
      pageSize: 20,
      status: 'ACTIVE',
      search: 'summer',
    });

    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      items: [
        {
          id: 'program-1',
          memberCount: 3,
          conversionCount: 8,
          configurationLocked: true,
          tier1Rate: 6,
          tier2Rate: 2,
        },
      ],
    });
    expect(repositoryMock.findSellerPrograms).toHaveBeenCalledWith({
      requesterUserId: 'seller-1',
      skip: 0,
      take: 20,
      status: 'ACTIVE',
      search: 'summer',
    });
  });
});
