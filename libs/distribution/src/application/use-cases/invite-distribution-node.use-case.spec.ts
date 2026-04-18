import { Test, TestingModule } from '@nestjs/testing';
import { InviteDistributionNodeUseCase } from './invite-distribution-node.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('InviteDistributionNodeUseCase', () => {
  let useCase: InviteDistributionNodeUseCase;

  const repositoryMock = {
    findOwnedNetworkByUser: jest.fn(),
    findNodeById: jest.fn(),
    findAgentShopById: jest.fn(),
    findNodeByNetworkAndShop: jest.fn(),
    createInvitedNode: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteDistributionNodeUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<InviteDistributionNodeUseCase>(InviteDistributionNodeUseCase);
  });

  it('should create invited distributor node', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShop: {
        shopStatus: 'active',
      },
    });
    repositoryMock.findNodeById.mockResolvedValueOnce({
      id: 'root-node',
      networkId: 'network-1',
      level: 0,
      relationshipStatus: 'ACTIVE',
      shop: {
        id: 'shop-root',
        shopStatus: 'active',
      },
    });
    repositoryMock.findAgentShopById.mockResolvedValueOnce({ id: 'shop-dist-1' });
    repositoryMock.findNodeByNetworkAndShop.mockResolvedValueOnce(null);
    repositoryMock.createInvitedNode.mockResolvedValueOnce({
      id: 'node-1',
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
      relationshipStatus: 'INVITED',
      createdAt: new Date('2026-04-17T11:00:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node',
    });

    expect(repositoryMock.createInvitedNode).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'node-1',
      relationshipStatus: 'INVITED',
    });
  });
});
