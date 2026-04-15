import { Test, TestingModule } from '@nestjs/testing';
import { CreateDistributionNodeUseCase } from './create-distribution-node.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('CreateDistributionNodeUseCase', () => {
  let useCase: CreateDistributionNodeUseCase;

  const repositoryMock = {
    findOwnedNetworkByUser: jest.fn(),
    findNodeById: jest.fn(),
    findAgentShopById: jest.fn(),
    createNode: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateDistributionNodeUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateDistributionNodeUseCase>(CreateDistributionNodeUseCase);
  });

  it('should create a level 1 distributor node from manufacturer root', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShopId: 'shop-mnf-1',
    });
    repositoryMock.findNodeById.mockResolvedValueOnce({
      id: 'root-node-1',
      networkId: 'network-1',
      level: 0,
      shopId: 'shop-mnf-1',
    });
    repositoryMock.findAgentShopById.mockResolvedValueOnce({ id: 'shop-dist-1' });
    repositoryMock.createNode.mockResolvedValueOnce({
      id: 'node-1',
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node-1',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
      relationshipStatus: 'ACTIVE',
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node-1',
    });

    expect(repositoryMock.createNode).toHaveBeenCalledWith({
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node-1',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
    });
    expect(result).toMatchObject({
      id: 'node-1',
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node-1',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
    });
  });

  it('should reject non-distributor shops as child nodes', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShopId: 'shop-mnf-1',
    });
    repositoryMock.findNodeById.mockResolvedValueOnce({
      id: 'root-node-1',
      networkId: 'network-1',
      level: 0,
      shopId: 'shop-mnf-1',
    });
    repositoryMock.findAgentShopById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        networkId: 'network-1',
        shopId: 'shop-normal-1',
        parentNodeId: 'root-node-1',
      }),
    ).rejects.toThrow('Only DISTRIBUTOR shops can be added as child distribution nodes');
  });

  it('should reject nodes deeper than level 3', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShopId: 'shop-mnf-1',
    });
    repositoryMock.findNodeById.mockResolvedValueOnce({
      id: 'node-level-3',
      networkId: 'network-1',
      level: 3,
      shopId: 'shop-dist-3',
    });
    repositoryMock.findAgentShopById.mockResolvedValueOnce({ id: 'shop-dist-4' });

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        networkId: 'network-1',
        shopId: 'shop-dist-4',
        parentNodeId: 'node-level-3',
      }),
    ).rejects.toThrow('Distribution network only supports agent levels 1 to 3');
  });
});
