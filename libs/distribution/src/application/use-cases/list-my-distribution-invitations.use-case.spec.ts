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
        createdAt: new Date('2026-04-17T12:15:00.000Z'),
      },
    ]);

    const result = await useCase.execute('owner-1');

    expect(repositoryMock.findInvitedNodesByOwner).toHaveBeenCalledWith('owner-1');
    expect(result).toMatchObject([
      {
        id: 'node-1',
        relationshipStatus: 'INVITED',
      },
    ]);
  });
});
