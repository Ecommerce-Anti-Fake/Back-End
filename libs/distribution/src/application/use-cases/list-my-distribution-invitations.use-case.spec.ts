import { Test, TestingModule } from '@nestjs/testing';
import { ListMyDistributionInvitationsUseCase } from './list-my-distribution-invitations.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('ListMyDistributionInvitationsUseCase', () => {
  let useCase: ListMyDistributionInvitationsUseCase;

  const repositoryMock = {
    findInvitedNodesByOwner: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListMyDistributionInvitationsUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ListMyDistributionInvitationsUseCase>(ListMyDistributionInvitationsUseCase);
  });

  it('should list invited nodes for current distributor owner', async () => {
    repositoryMock.findInvitedNodesByOwner.mockResolvedValueOnce([
      {
        id: 'node-1',
        networkId: 'network-1',
        shopId: 'shop-dist-1',
        parentNodeId: 'root-node',
        level: 1,
        nodeType: 'AGENT_LEVEL_1',
        relationshipStatus: 'INVITED',
        shop: {
          shopName: 'Dai ly XYZ',
        },
        parent: {
          id: 'root-node',
          shopId: 'manufacturer-shop',
          level: 0,
          shop: {
            shopName: 'Nha san xuat ABC',
          },
        },
        network: {
          networkName: 'Network ABC',
          brandId: 'brand-1',
          brand: {
            name: 'Brand ABC',
          },
          manufacturerShopId: 'manufacturer-shop',
          manufacturerShop: {
            shopName: 'Nha san xuat ABC',
          },
        },
        createdAt: new Date('2026-04-17T12:15:00.000Z'),
      },
    ]);

    const result = await useCase.execute('owner-1');

    expect(repositoryMock.findInvitedNodesByOwner).toHaveBeenCalledWith('owner-1');
    expect(result).toMatchObject([
      {
        id: 'node-1',
        networkName: 'Network ABC',
        shopName: 'Dai ly XYZ',
        parentShopName: 'Nha san xuat ABC',
        manufacturerShopName: 'Nha san xuat ABC',
        level: 1,
        relationshipStatus: 'INVITED',
      },
    ]);
  });
});
