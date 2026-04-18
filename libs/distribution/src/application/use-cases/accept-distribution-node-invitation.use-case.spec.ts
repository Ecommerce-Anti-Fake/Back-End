import { Test, TestingModule } from '@nestjs/testing';
import { AcceptDistributionNodeInvitationUseCase } from './accept-distribution-node-invitation.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('AcceptDistributionNodeInvitationUseCase', () => {
  let useCase: AcceptDistributionNodeInvitationUseCase;

  const repositoryMock = {
    findNodeById: jest.fn(),
    updateNodeRelationshipStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptDistributionNodeInvitationUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<AcceptDistributionNodeInvitationUseCase>(AcceptDistributionNodeInvitationUseCase);
  });

  it('should allow invited distributor owner to accept invitation', async () => {
    repositoryMock.findNodeById
      .mockResolvedValueOnce({
        id: 'node-1',
        networkId: 'network-1',
        level: 1,
        nodeType: 'AGENT_LEVEL_1',
        parentNodeId: 'root-node',
        relationshipStatus: 'INVITED',
        shop: {
          id: 'shop-dist-1',
          ownerUserId: 'owner-1',
          shopStatus: 'active',
        },
      })
      .mockResolvedValueOnce({
        id: 'root-node',
        networkId: 'network-1',
        level: 0,
        nodeType: 'MANUFACTURER',
        parentNodeId: null,
        relationshipStatus: 'ACTIVE',
        shop: {
          id: 'shop-root',
          ownerUserId: 'manufacturer-1',
          shopStatus: 'active',
        },
      });
    repositoryMock.updateNodeRelationshipStatus.mockResolvedValueOnce({
      id: 'node-1',
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
      relationshipStatus: 'ACTIVE',
      createdAt: new Date('2026-04-17T11:30:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'owner-1',
      nodeId: 'node-1',
    });

    expect(repositoryMock.updateNodeRelationshipStatus).toHaveBeenCalledWith('node-1', 'ACTIVE');
    expect(result).toMatchObject({
      id: 'node-1',
      relationshipStatus: 'ACTIVE',
    });
  });

  it('should reject acceptance from non-owner', async () => {
    repositoryMock.findNodeById.mockResolvedValueOnce({
      id: 'node-1',
      networkId: 'network-1',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
      parentNodeId: 'root-node',
      relationshipStatus: 'INVITED',
      shop: {
        id: 'shop-dist-1',
        ownerUserId: 'owner-1',
        shopStatus: 'active',
      },
    });

    await expect(
      useCase.execute({
        requesterUserId: 'other-user',
        nodeId: 'node-1',
      }),
    ).rejects.toThrow('Only the invited distributor owner can accept this invitation');
  });
});
