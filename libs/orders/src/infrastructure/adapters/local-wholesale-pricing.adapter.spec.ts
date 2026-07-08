import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../persistence/orders.repository';
import { LocalWholesalePricingAdapter } from './local-wholesale-pricing.adapter';

describe('LocalWholesalePricingAdapter', () => {
  let service: LocalWholesalePricingAdapter;

  const ordersRepositoryMock = {
    findDistributionNodeById: jest.fn(),
    findApplicablePricingPolicies: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalWholesalePricingAdapter,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    service = module.get<LocalWholesalePricingAdapter>(LocalWholesalePricingAdapter);
  });

  it('should return outside-network pricing when buyer has no distribution node', async () => {
    const result = await service.resolve({
      buyerShopId: 'buyer-shop-1',
      offer: createOffer({
        price: 100,
      }),
      quantity: 2,
    });

    expect(result).toMatchObject({
      buyerDistributionNodeId: null,
      unitPrice: 100,
      baseAmount: 200,
      discountAmount: 0,
      platformFeeAmount: 40,
      buyerPayableAmount: 200,
      sellerReceivableAmount: 160,
      totalAmount: 200,
      isInNetworkTrade: false,
    });
  });

  it('should prefer node specific policy over level and network defaults', async () => {
    ordersRepositoryMock.findDistributionNodeById.mockResolvedValueOnce({
      id: 'buyer-node-1',
      shopId: 'buyer-shop-1',
      networkId: 'network-1',
      level: 1,
      parentNodeId: 'seller-node-1',
      relationshipStatus: 'ACTIVE',
      shop: {
        shopStatus: 'verified',
      },
    });
    ordersRepositoryMock.findApplicablePricingPolicies.mockResolvedValueOnce([
      createPolicy({ scope: 'NETWORK_DEFAULT', discountValue: 5 }),
      createPolicy({ scope: 'NODE_LEVEL', appliesToLevel: 1, discountValue: 10 }),
      createPolicy({ scope: 'NODE_SPECIFIC', nodeId: 'buyer-node-1', appliesToLevel: 1, discountValue: 15 }),
    ]);

    const result = await service.resolve({
      buyerShopId: 'buyer-shop-1',
      buyerDistributionNodeId: 'buyer-node-1',
      offer: createOffer({
        price: 100,
        distributionNode: {
          id: 'seller-node-1',
          networkId: 'network-1',
          level: 0,
          relationshipStatus: 'ACTIVE',
          shop: {
            shopStatus: 'verified',
          },
        },
      }),
      quantity: 2,
    });

    expect(result).toMatchObject({
      buyerDistributionNodeId: 'buyer-node-1',
      unitPrice: 85,
      baseAmount: 200,
      discountAmount: 30,
      platformFeeAmount: 10,
      buyerPayableAmount: 170,
      sellerReceivableAmount: 160,
      totalAmount: 170,
      isInNetworkTrade: true,
    });
  });

  it('should apply default tier economics when no explicit policy exists', async () => {
    ordersRepositoryMock.findDistributionNodeById.mockResolvedValueOnce({
      id: 'buyer-node-2',
      shopId: 'buyer-shop-1',
      networkId: 'network-1',
      level: 2,
      parentNodeId: 'seller-node-1',
      relationshipStatus: 'ACTIVE',
      shop: {
        shopStatus: 'verified',
      },
    });
    ordersRepositoryMock.findApplicablePricingPolicies.mockResolvedValueOnce([]);

    const result = await service.resolve({
      buyerShopId: 'buyer-shop-1',
      buyerDistributionNodeId: 'buyer-node-2',
      offer: createOffer({
        price: 100,
        distributionNode: {
          id: 'seller-node-1',
          networkId: 'network-1',
          level: 1,
          relationshipStatus: 'ACTIVE',
          shop: {
            shopStatus: 'verified',
          },
        },
      }),
      quantity: 1,
    });

    expect(result).toMatchObject({
      buyerDistributionNodeId: 'buyer-node-2',
      unitPrice: 90,
      baseAmount: 100,
      discountAmount: 10,
      platformFeeAmount: 10,
      buyerPayableAmount: 90,
      sellerReceivableAmount: 80,
      totalAmount: 90,
      isInNetworkTrade: true,
    });
  });

  it('should reject in-network pricing when buyer is not direct child of seller node', async () => {
    ordersRepositoryMock.findDistributionNodeById.mockResolvedValueOnce({
      id: 'buyer-node-2',
      shopId: 'buyer-shop-1',
      networkId: 'network-1',
      level: 2,
      parentNodeId: 'other-level-1-node',
      relationshipStatus: 'ACTIVE',
      shop: {
        shopStatus: 'verified',
      },
    });

    await expect(
      service.resolve({
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-2',
        offer: createOffer({
          distributionNode: {
            id: 'seller-node-1',
            networkId: 'network-1',
            level: 1,
            relationshipStatus: 'ACTIVE',
            shop: {
              shopStatus: 'verified',
            },
          },
        }),
        quantity: 1,
      }),
    ).rejects.toThrow('Buyer distribution node must be a direct child of the seller node');
  });

  it('should reject in-network pricing when offer is not attached to a distribution node', async () => {
    ordersRepositoryMock.findDistributionNodeById.mockResolvedValueOnce({
      id: 'buyer-node-1',
      shopId: 'buyer-shop-1',
      networkId: 'network-1',
      level: 1,
      parentNodeId: 'seller-node-1',
      relationshipStatus: 'ACTIVE',
      shop: {
        shopStatus: 'verified',
      },
    });

    await expect(
      service.resolve({
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-1',
        offer: createOffer({
          distributionNode: null,
        }),
        quantity: 1,
      }),
    ).rejects.toThrow('Only offers attached to a distribution node can use in-network pricing');
  });
});

function createOffer(overrides?: Partial<any>) {
  return {
    id: 'offer-1',
    title: 'Offer 1',
    price: new Prisma.Decimal(overrides?.price ?? 100),
    availableQuantity: 500,
    productModelId: 'product-model-1',
    categoryId: 'category-1',
    shopId: 'seller-shop-1',
    shop: {
      id: 'seller-shop-1',
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    distributionNode: null,
    ...overrides,
  };
}

function createPolicy(overrides?: Partial<any>) {
  return {
    id: 'policy-1',
    networkId: 'network-1',
    scope: 'NETWORK_DEFAULT',
    nodeId: null,
    appliesToLevel: null,
    productModelId: null,
    categoryId: null,
    discountType: 'PERCENT',
    discountValue: new Prisma.Decimal(overrides?.discountValue ?? 5),
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
