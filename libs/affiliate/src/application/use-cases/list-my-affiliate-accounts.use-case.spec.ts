import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { ListMyAffiliateAccountsUseCase } from './list-my-affiliate-accounts.use-case';

describe('ListMyAffiliateAccountsUseCase', () => {
  let useCase: ListMyAffiliateAccountsUseCase;

  const repositoryMock = {
    findAffiliateAccountsByUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListMyAffiliateAccountsUseCase,
        { provide: AffiliateRepository, useValue: repositoryMock },
      ],
    }).compile();
    useCase = module.get(ListMyAffiliateAccountsUseCase);
  });

  it('includes the joined program details required by Affiliate Center', async () => {
    repositoryMock.findAffiliateAccountsByUser.mockResolvedValueOnce([
      {
        id: 'account-1',
        programId: 'program-1',
        userId: 'user-1',
        parentAccountId: null,
        accountStatus: 'ACTIVE',
        referralPath: null,
        joinedAt: new Date('2026-07-20T00:00:00.000Z'),
        approvedAt: new Date('2026-07-20T00:00:00.000Z'),
        program: {
          name: 'Creator program',
          ownerShopId: 'shop-1',
          ownerShop: { shopName: 'AntiFake Shop' },
          scopeType: 'OFFER',
          offerId: 'offer-1',
          offer: { title: 'Verified offer' },
          programStatus: 'ACTIVE',
          tier1Rate: new Prisma.Decimal(6),
          tier2Rate: new Prisma.Decimal(2),
          commissionHoldDays: 7,
          endedAt: null,
        },
      },
    ]);

    const result = await useCase.execute('user-1');

    expect(result[0]).toMatchObject({
      id: 'account-1',
      programName: 'Creator program',
      program: {
        ownerShopId: 'shop-1',
        ownerShopName: 'AntiFake Shop',
        scopeType: 'OFFER',
        offerId: 'offer-1',
        offerTitle: 'Verified offer',
        tier1Rate: 6,
        tier2Rate: 2,
        commissionHoldDays: 7,
        programStatus: 'ACTIVE',
      },
    });
  });
});
