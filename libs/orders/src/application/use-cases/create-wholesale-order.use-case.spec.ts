import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CreateWholesaleOrderUseCase } from './create-wholesale-order.use-case';

describe('CreateWholesaleOrderUseCase', () => {
  let useCase: CreateWholesaleOrderUseCase;

  const ordersRepositoryMock = {
    findOfferForOrdering: jest.fn(),
    findOwnedShop: jest.fn(),
    findDistributionNodeById: jest.fn(),
    findApplicablePricingPolicies: jest.fn(),
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWholesaleOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateWholesaleOrderUseCase>(CreateWholesaleOrderUseCase);
  });

  it('should apply 20% platform fee outside network and keep buyer payable at offer price', async () => {
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        price: 100,
        salesMode: 'WHOLESALE',
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({ id: 'buyer-shop-1' });
    ordersRepositoryMock.createOrder.mockResolvedValueOnce(
      createOrderRecord({
        baseAmount: 200,
        discountAmount: 0,
        platformFeeAmount: 40,
        buyerPayableAmount: 200,
        sellerReceivableAmount: 160,
        totalAmount: 200,
        unitPrice: 100,
        quantity: 2,
      }),
    );

    const result = await useCase.execute({
      buyerUserId: 'user-1',
      buyerShopId: 'buyer-shop-1',
      offerId: 'offer-1',
      quantity: 2,
    });

    expect(ordersRepositoryMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerDistributionNodeId: null,
        baseAmount: 200,
        discountAmount: 0,
        platformFeeAmount: 40,
        buyerPayableAmount: 200,
        sellerReceivableAmount: 160,
        totalAmount: 200,
        item: expect.objectContaining({
          unitPrice: 100,
          quantity: 2,
        }),
      }),
    );
    expect(result).toMatchObject({
      buyerPayableAmount: 200,
      sellerReceivableAmount: 160,
      platformFeeAmount: 40,
    });
  });

  it('should prefer node specific policy over level and network defaults for in-network trade', async () => {
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        price: 100,
        salesMode: 'BOTH',
        distributionNode: {
          id: 'seller-node-1',
          networkId: 'network-1',
        },
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({ id: 'buyer-shop-1' });
    ordersRepositoryMock.findDistributionNodeById.mockResolvedValueOnce({
      id: 'buyer-node-1',
      shopId: 'buyer-shop-1',
      networkId: 'network-1',
      level: 1,
    });
    ordersRepositoryMock.findApplicablePricingPolicies.mockResolvedValueOnce([
      createPolicy({ scope: 'NETWORK_DEFAULT', discountValue: 5 }),
      createPolicy({ scope: 'NODE_LEVEL', appliesToLevel: 1, discountValue: 10 }),
      createPolicy({ scope: 'NODE_SPECIFIC', nodeId: 'buyer-node-1', appliesToLevel: 1, discountValue: 15 }),
    ]);
    ordersRepositoryMock.createOrder.mockResolvedValueOnce(
      createOrderRecord({
        buyerDistributionNodeId: 'buyer-node-1',
        baseAmount: 200,
        discountAmount: 30,
        platformFeeAmount: 25.5,
        buyerPayableAmount: 195.5,
        sellerReceivableAmount: 170,
        totalAmount: 195.5,
        unitPrice: 85,
        quantity: 2,
      }),
    );

    const result = await useCase.execute({
      buyerUserId: 'user-1',
      buyerShopId: 'buyer-shop-1',
      buyerDistributionNodeId: 'buyer-node-1',
      offerId: 'offer-1',
      quantity: 2,
    });

    expect(ordersRepositoryMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerDistributionNodeId: 'buyer-node-1',
        baseAmount: 200,
        discountAmount: 30,
        platformFeeAmount: 25.5,
        buyerPayableAmount: 195.5,
        sellerReceivableAmount: 170,
        totalAmount: 195.5,
        item: expect.objectContaining({
          unitPrice: 85,
          quantity: 2,
        }),
      }),
    );
    expect(result).toMatchObject({
      buyerDistributionNodeId: 'buyer-node-1',
      buyerPayableAmount: 195.5,
      sellerReceivableAmount: 170,
      discountAmount: 30,
      platformFeeAmount: 25.5,
    });
  });

  it('should reject non-percent policy for in-network trade', async () => {
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        price: 100,
        salesMode: 'WHOLESALE',
        distributionNode: {
          id: 'seller-node-1',
          networkId: 'network-1',
        },
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({ id: 'buyer-shop-1' });
    ordersRepositoryMock.findDistributionNodeById.mockResolvedValueOnce({
      id: 'buyer-node-1',
      shopId: 'buyer-shop-1',
      networkId: 'network-1',
      level: 1,
    });
    ordersRepositoryMock.findApplicablePricingPolicies.mockResolvedValueOnce([
      createPolicy({
        scope: 'NODE_SPECIFIC',
        nodeId: 'buyer-node-1',
        appliesToLevel: 1,
        discountType: 'FIXED_AMOUNT',
        discountValue: 10,
      }),
    ]);

    await expect(
      useCase.execute({
        buyerUserId: 'user-1',
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-1',
        offerId: 'offer-1',
        quantity: 1,
      }),
    ).rejects.toThrow('In-network pricing policy must use percent discount');
  });
});

function createOffer(overrides?: Partial<any>) {
  return {
    id: 'offer-1',
    title: 'Offer 1',
    price: new Prisma.Decimal(overrides?.price ?? 100),
    availableQuantity: 500,
    salesMode: 'WHOLESALE',
    minWholesaleQty: 1,
    verificationLevel: 'SERIALIZED',
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

function createOrderRecord(input: {
  buyerDistributionNodeId?: string | null;
  baseAmount: number;
  discountAmount: number;
  platformFeeAmount: number;
  buyerPayableAmount: number;
  sellerReceivableAmount: number;
  totalAmount: number;
  unitPrice: number;
  quantity: number;
}) {
  return {
    id: 'order-1',
    orderMode: 'WHOLESALE',
    orderStatus: 'pending',
    shopId: 'seller-shop-1',
    buyerUserId: 'user-1',
    buyerShopId: 'buyer-shop-1',
    buyerDistributionNodeId: input.buyerDistributionNodeId ?? null,
    baseAmount: new Prisma.Decimal(input.baseAmount),
    discountAmount: new Prisma.Decimal(input.discountAmount),
    platformFeeAmount: new Prisma.Decimal(input.platformFeeAmount),
    buyerPayableAmount: new Prisma.Decimal(input.buyerPayableAmount),
    sellerReceivableAmount: new Prisma.Decimal(input.sellerReceivableAmount),
    totalAmount: new Prisma.Decimal(input.totalAmount),
    createdAt: new Date('2026-04-14T10:00:00.000Z'),
    shop: {
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
    },
    buyerShop: {
      ownerUserId: 'user-1',
    },
    items: [
      {
        offerId: 'offer-1',
        offerTitleSnapshot: 'Offer 1',
        unitPrice: new Prisma.Decimal(input.unitPrice),
        quantity: input.quantity,
        verificationLevelSnapshot: 'SERIALIZED',
      },
    ],
  };
}
