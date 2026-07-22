import { Test } from '@nestjs/testing';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListActiveAffiliateProgramsUseCase } from './list-active-affiliate-programs.use-case';

describe('ListActiveAffiliateProgramsUseCase', () => {
  it('returns the public catalog mapped without owner PII', async () => {
    const repository = {
      countActivePrograms: jest.fn().mockResolvedValue(1),
      findActivePrograms: jest.fn().mockResolvedValue([
        {
          id: 'program-1',
          ownerShopId: 'shop-1',
          ownerShop: { shopName: 'Shop A' },
          brandId: null,
          brand: null,
          offerId: null,
          offer: null,
          scopeType: 'SHOP',
          name: 'Campaign',
          slug: 'campaign',
          programStatus: 'ACTIVE',
          attributionWindowDays: 7,
          commissionHoldDays: 7,
          commissionModel: 'revenue_share',
          settlementMode: 'AUTOMATIC',
          tier1Rate: { toString: () => '6' },
          tier2Rate: { toString: () => '2' },
          startedAt: null,
          endedAt: null,
          createdAt: new Date('2026-07-22T00:00:00.000Z'),
        },
      ]),
    };
    const module = await Test.createTestingModule({
      providers: [
        ListActiveAffiliateProgramsUseCase,
        { provide: AffiliateRepository, useValue: repository },
      ],
    }).compile();

    const result = await module.get(ListActiveAffiliateProgramsUseCase).execute({ page: 2, pageSize: 10 });

    expect(result.items[0]).toEqual(expect.objectContaining({
      id: 'program-1',
      ownerShopName: 'Shop A',
      tier1Rate: 6,
      tier2Rate: 2,
    }));
    expect(result.items[0]).not.toHaveProperty('ownerUserId');
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 1, totalPages: 1 });
    expect(repository.findActivePrograms).toHaveBeenCalledWith(expect.any(Date), 10, 10);
  });
});
