import { Test, TestingModule } from '@nestjs/testing';
import { ListMyDistributionMembershipsUseCase } from './list-my-distribution-memberships.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('ListMyDistributionMembershipsUseCase', () => {
  let useCase: ListMyDistributionMembershipsUseCase;

  const repositoryMock = {
    findMembershipsByOwner: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListMyDistributionMembershipsUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ListMyDistributionMembershipsUseCase>(ListMyDistributionMembershipsUseCase);
  });

  it('should return distributor memberships with network and brand context', async () => {
    repositoryMock.findMembershipsByOwner.mockResolvedValueOnce([
      {
        id: 'node-1',
        networkId: 'network-1',
        shopId: 'shop-dist-1',
        parentNodeId: 'root-node',
        level: 1,
        nodeType: 'AGENT_LEVEL_1',
        relationshipStatus: 'ACTIVE',
        createdAt: new Date('2026-04-17T13:00:00.000Z'),
        shop: {
          shopName: 'Dai ly XYZ',
        },
        network: {
          id: 'network-1',
          networkName: 'Network ABC',
          brandId: 'brand-1',
          brand: {
            name: 'Brand ABC',
          },
          manufacturerShopId: 'shop-mnf-1',
          manufacturerShop: {
            shopName: 'Cong ty ABC',
          },
        },
      },
    ]);

    const result = await useCase.execute('owner-1');

    expect(result).toMatchObject([
      {
        nodeId: 'node-1',
        networkId: 'network-1',
        networkName: 'Network ABC',
        brandId: 'brand-1',
        brandName: 'Brand ABC',
        manufacturerShopName: 'Cong ty ABC',
        relationshipStatus: 'ACTIVE',
      },
    ]);
  });
});
