import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { CreatePricingPolicyUseCase } from './create-pricing-policy.use-case';

describe('CreatePricingPolicyUseCase', () => {
  let useCase: CreatePricingPolicyUseCase;

  const pricingRepositoryMock = {
    findOwnedNetworkByUser: jest.fn(),
    findNodeById: jest.fn(),
    findComparablePolicies: jest.fn(),
    createPolicy: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePricingPolicyUseCase,
        { provide: DistributionPricingRepository, useValue: pricingRepositoryMock },
      ],
    }).compile();

    useCase = module.get<CreatePricingPolicyUseCase>(CreatePricingPolicyUseCase);
  });

  it('should create a level-based pricing policy when hierarchy is valid', async () => {
    pricingRepositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShopId: 'shop-1',
    });
    pricingRepositoryMock.findComparablePolicies.mockResolvedValueOnce([
      createPolicyRecord({
        id: 'policy-level-1',
        scope: 'NODE_LEVEL',
        appliesToLevel: 1,
        discountValue: 15,
      }),
      createPolicyRecord({
        id: 'policy-level-3',
        scope: 'NODE_LEVEL',
        appliesToLevel: 3,
        discountValue: 6,
      }),
    ]);
    pricingRepositoryMock.createPolicy.mockResolvedValueOnce(
      createPolicyRecord({
        id: 'policy-level-2',
        scope: 'NODE_LEVEL',
        appliesToLevel: 2,
        discountValue: 10,
        minQuantity: 50,
      }),
    );

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      networkId: 'network-1',
      scope: 'NODE_LEVEL',
      appliesToLevel: 2,
      discountValue: 10,
      minQuantity: 50,
    });

    expect(pricingRepositoryMock.createPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        networkId: 'network-1',
        scope: 'NODE_LEVEL',
        nodeId: null,
        appliesToLevel: 2,
        discountValue: 10,
        minQuantity: 50,
      }),
    );
    expect(result).toMatchObject({
      id: 'policy-level-2',
      scope: 'NODE_LEVEL',
      appliesToLevel: 2,
      discountValue: 10,
    });
  });

  it('should reject hierarchy violations when lower level discount is not smaller than upper level', async () => {
    pricingRepositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShopId: 'shop-1',
    });
    pricingRepositoryMock.findComparablePolicies.mockResolvedValueOnce([
      createPolicyRecord({
        scope: 'NODE_LEVEL',
        appliesToLevel: 1,
        discountValue: 15,
      }),
    ]);

    await expect(
      useCase.execute({
        requesterUserId: 'user-1',
        networkId: 'network-1',
        scope: 'NODE_LEVEL',
        appliesToLevel: 2,
        discountValue: 15,
      }),
    ).rejects.toThrow('Discount hierarchy must satisfy level 1 > level 2 > level 3');
  });

  it('should derive appliesToLevel from node when creating node-specific policy', async () => {
    pricingRepositoryMock.findOwnedNetworkByUser.mockResolvedValueOnce({
      id: 'network-1',
      manufacturerShopId: 'shop-1',
    });
    pricingRepositoryMock.findNodeById.mockResolvedValueOnce({
      id: 'node-2',
      networkId: 'network-1',
      level: 2,
      shopId: 'shop-2',
    });
    pricingRepositoryMock.findComparablePolicies.mockResolvedValueOnce([]);
    pricingRepositoryMock.createPolicy.mockResolvedValueOnce(
      createPolicyRecord({
        id: 'policy-node-2',
        scope: 'NODE_SPECIFIC',
        nodeId: 'node-2',
        appliesToLevel: 2,
        discountValue: 9,
      }),
    );

    const result = await useCase.execute({
      requesterUserId: 'user-1',
      networkId: 'network-1',
      scope: 'NODE_SPECIFIC',
      nodeId: 'node-2',
      discountValue: 9,
    });

    expect(pricingRepositoryMock.createPolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'NODE_SPECIFIC',
        nodeId: 'node-2',
        appliesToLevel: 2,
        discountValue: 9,
      }),
    );
    expect(result).toMatchObject({
      id: 'policy-node-2',
      nodeId: 'node-2',
      appliesToLevel: 2,
      discountValue: 9,
    });
  });
});

function createPolicyRecord(overrides?: Partial<any>) {
  return {
    id: 'policy-1',
    networkId: 'network-1',
    scope: 'NODE_LEVEL',
    nodeId: null,
    appliesToLevel: 1,
    productModelId: null,
    categoryId: null,
    discountType: 'PERCENT',
    discountValue: new Prisma.Decimal(overrides?.discountValue ?? 10),
    minQuantity: null,
    priority: 100,
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdAt: new Date('2026-04-14T10:00:00.000Z'),
    updatedAt: new Date('2026-04-14T10:00:00.000Z'),
    ...overrides,
  };
}
