import { Test, TestingModule } from '@nestjs/testing';
import { UpdateDistributionNodeStatusUseCase } from './update-distribution-node-status.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('UpdateDistributionNodeStatusUseCase', () => {
  let useCase: UpdateDistributionNodeStatusUseCase;

  const repositoryMock = {
    findOwnedNetworkByUser: jest.fn(),
    findNodeById: jest.fn(),
    findActiveChildNodes: jest.fn(),
    updateNodeRelationshipStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateDistributionNodeStatusUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<UpdateDistributionNodeStatusUseCase>(UpdateDistributionNodeStatusUseCase);
  });

  it('should reject status changes for manufacturer root node', async () => {
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
      nodeType: 'MANUFACTURER',
      parentNodeId: null,
      relationshipStatus: 'ACTIVE',
      shop: {
        id: 'shop-root',
        shopStatus: 'active',
      },
    });

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        networkId: 'network-1',
        nodeId: 'root-node',
        relationshipStatus: 'SUSPENDED',
      }),
    ).rejects.toThrow('Manufacturer root node cannot change relationship status');
  });

  it('should reject suspension when node still has active child distributors', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShop: {
        shopStatus: 'active',
      },
    });
    repositoryMock.findNodeById.mockResolvedValueOnce({
      id: 'node-1',
      networkId: 'network-1',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
      parentNodeId: 'root-node',
      relationshipStatus: 'ACTIVE',
      shop: {
        id: 'shop-1',
        shopStatus: 'active',
      },
    });
    repositoryMock.findActiveChildNodes.mockResolvedValueOnce([{ id: 'child-node-1' }]);

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        networkId: 'network-1',
        nodeId: 'node-1',
        relationshipStatus: 'SUSPENDED',
      }),
    ).rejects.toThrow('Cannot change node status while it still has active child distributors');
  });

  it('should reactivate suspended node when parent and shop are active', async () => {
    repositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShop: {
        shopStatus: 'active',
      },
    });
    repositoryMock.findNodeById
      .mockResolvedValueOnce({
        id: 'node-1',
        networkId: 'network-1',
        level: 2,
        nodeType: 'AGENT_LEVEL_2',
        parentNodeId: 'parent-node',
        relationshipStatus: 'SUSPENDED',
        shop: {
          id: 'shop-1',
          shopStatus: 'active',
        },
      })
      .mockResolvedValueOnce({
        id: 'parent-node',
        networkId: 'network-1',
        level: 1,
        nodeType: 'AGENT_LEVEL_1',
        parentNodeId: 'root-node',
        relationshipStatus: 'ACTIVE',
        shop: {
          id: 'shop-parent',
          shopStatus: 'active',
        },
      });
    repositoryMock.updateNodeRelationshipStatus.mockResolvedValueOnce({
      id: 'node-1',
      networkId: 'network-1',
      shopId: 'shop-1',
      parentNodeId: 'parent-node',
      level: 2,
      nodeType: 'AGENT_LEVEL_2',
      relationshipStatus: 'ACTIVE',
      createdAt: new Date('2026-04-17T10:00:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      networkId: 'network-1',
      nodeId: 'node-1',
      relationshipStatus: 'ACTIVE',
    });

    expect(repositoryMock.updateNodeRelationshipStatus).toHaveBeenCalledWith('node-1', 'ACTIVE');
    expect(result).toMatchObject({
      id: 'node-1',
      relationshipStatus: 'ACTIVE',
    });
  });
});
