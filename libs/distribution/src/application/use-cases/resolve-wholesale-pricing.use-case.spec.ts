import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { DistributionPricingRepository } from '../../infrastructure/persistence/distribution-pricing.repository';
import { ResolveWholesalePricingUseCase } from './resolve-wholesale-pricing.use-case';

describe('ResolveWholesalePricingUseCase', () => {
  let useCase: ResolveWholesalePricingUseCase;

  const repositoryMock = {
    findNodeById: jest.fn(),
    findApplicablePricingPolicies: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResolveWholesalePricingUseCase,
        { provide: DistributionPricingRepository, useValue: repositoryMock },
      ],
    }).compile();

    useCase = module.get<ResolveWholesalePricingUseCase>(ResolveWholesalePricingUseCase);
  });

  it('should price a level 3 purchase with 5% discount and 15% platform fee from list value', async () => {
    repositoryMock.findNodeById
      .mockResolvedValueOnce(createNode({ id: 'buyer-node-3', level: 3, parentNodeId: 'seller-node-2' }))
      .mockResolvedValueOnce(createNode({ id: 'seller-node-2', shopId: 'seller-shop-2', level: 2 }));
    repositoryMock.findApplicablePricingPolicies.mockResolvedValueOnce([]);

    const result = await useCase.execute({
      buyerShopId: 'buyer-shop-3',
      buyerDistributionNodeId: 'buyer-node-3',
      quantity: 2,
      offer: {
        price: 100,
        productModelId: 'product-model-1',
        categoryId: 'category-1',
        distributionNodeId: 'seller-node-2',
        distributionNetworkId: 'network-1',
      },
    });

    expect(result).toMatchObject({
      buyerDistributionNodeId: 'buyer-node-3',
      unitPrice: 95,
      discountPercent: 5,
      baseAmount: 200,
      discountAmount: 10,
      platformFeeAmount: 30,
      buyerPayableAmount: 190,
      sellerReceivableAmount: 160,
      totalAmount: 190,
      isInNetworkTrade: true,
    });
  });

  it('should reject direct manufacturer purchase by level 2 distributor', async () => {
    repositoryMock.findNodeById
      .mockResolvedValueOnce(createNode({ id: 'buyer-node-2', level: 2, parentNodeId: 'level-1-node' }))
      .mockResolvedValueOnce(createNode({ id: 'manufacturer-node', shopId: 'manufacturer-shop', level: 0 }));

    await expect(
      useCase.execute({
        buyerShopId: 'buyer-shop-3',
        buyerDistributionNodeId: 'buyer-node-2',
        quantity: 1,
        offer: {
          price: 100,
          productModelId: 'product-model-1',
          categoryId: 'category-1',
          distributionNodeId: 'manufacturer-node',
          distributionNetworkId: 'network-1',
        },
      }),
    ).rejects.toThrow('Buyer distribution node must be a direct child of the seller node');
  });

  it('should reject pricing preview when buyer node belongs to another user', async () => {
    repositoryMock.findNodeById.mockResolvedValueOnce(
      createNode({
        id: 'buyer-node-1',
        shop: {
          id: 'buyer-shop-3',
          ownerUserId: 'other-user',
          shopStatus: 'verified',
        },
      }),
    );

    await expect(
      useCase.execute({
        requesterUserId: 'buyer-user',
        buyerShopId: 'buyer-shop-3',
        buyerDistributionNodeId: 'buyer-node-1',
        quantity: 1,
        offer: {
          price: 100,
          productModelId: 'product-model-1',
          categoryId: 'category-1',
          distributionNodeId: 'seller-node-1',
          distributionNetworkId: 'network-1',
        },
      }),
    ).rejects.toThrow('Distribution node does not belong to current user');
  });
});

function createNode(overrides?: Partial<any>) {
  return {
    id: 'buyer-node-1',
    shopId: 'buyer-shop-3',
    networkId: 'network-1',
    level: 1,
    parentNodeId: 'seller-node-1',
    relationshipStatus: 'ACTIVE',
    nodeType: 'AGENT_LEVEL_1',
    shop: {
      id: 'buyer-shop-3',
      ownerUserId: 'buyer-user',
      shopStatus: 'verified',
    },
    ...overrides,
  };
}

function createPolicy(overrides?: Partial<any>) {
  return {
    id: 'policy-1',
    networkId: 'network-1',
    scope: 'NODE_LEVEL',
    nodeId: null,
    appliesToLevel: 3,
    productModelId: null,
    categoryId: null,
    discountType: 'PERCENT',
    discountValue: new Prisma.Decimal(5),
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
