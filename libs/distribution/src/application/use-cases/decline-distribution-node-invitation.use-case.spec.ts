import { Test, TestingModule } from '@nestjs/testing';
import { DeclineDistributionNodeInvitationUseCase } from './decline-distribution-node-invitation.use-case';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';

describe('DeclineDistributionNodeInvitationUseCase', () => {
  let useCase: DeclineDistributionNodeInvitationUseCase;

  const repositoryMock = {
    findNodeById: jest.fn(),
    updateNodeRelationshipStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeclineDistributionNodeInvitationUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<DeclineDistributionNodeInvitationUseCase>(DeclineDistributionNodeInvitationUseCase);
  });

  it('should allow invited distributor owner to decline invitation', async () => {
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
    repositoryMock.updateNodeRelationshipStatus.mockResolvedValueOnce({
      id: 'node-1',
      networkId: 'network-1',
      shopId: 'shop-dist-1',
      parentNodeId: 'root-node',
      level: 1,
      nodeType: 'AGENT_LEVEL_1',
      relationshipStatus: 'DECLINED',
      createdAt: new Date('2026-04-17T12:00:00.000Z'),
    });

    const result = await useCase.execute({
      requesterUserId: 'owner-1',
      nodeId: 'node-1',
    });

    expect(repositoryMock.updateNodeRelationshipStatus).toHaveBeenCalledWith('node-1', 'DECLINED');
    expect(result).toMatchObject({
      id: 'node-1',
      relationshipStatus: 'DECLINED',
    });
  });
});
