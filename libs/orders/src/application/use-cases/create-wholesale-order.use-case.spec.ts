import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { WholesalePricingPort } from '../ports';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderPlacementService } from '../services';
import { CreateWholesaleOrderUseCase } from './create-wholesale-order.use-case';

describe('CreateWholesaleOrderUseCase', () => {
  let useCase: CreateWholesaleOrderUseCase;
  let orderPlacementService: { createOrder: jest.Mock };
  let wholesalePricingPort: { resolve: jest.Mock };

  const ordersRepositoryMock = {
    findUserById: jest.fn(),
    findOfferForOrdering: jest.fn(),
    findOwnedShop: jest.fn(),
    getOfferAllocatedBatchQuantity: jest.fn(),
  };
  const orderPlacementServiceMock = {
    createOrder: jest.fn(),
  };
  const wholesalePricingPortMock = {
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateWholesaleOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderPlacementService, useValue: orderPlacementServiceMock },
        { provide: WholesalePricingPort, useValue: wholesalePricingPortMock },
      ],
    }).compile();

    useCase = module.get<CreateWholesaleOrderUseCase>(CreateWholesaleOrderUseCase);
    orderPlacementService = module.get(OrderPlacementService);
    wholesalePricingPort = module.get(WholesalePricingPort);
  });

  it('should apply 20% platform fee outside network and keep buyer payable at offer price', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
      address: '12 Nguyen Trai, Quan 1, TP.HCM',
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        price: 100,
        salesMode: 'WHOLESALE',
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'buyer-shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });
    wholesalePricingPortMock.resolve.mockResolvedValueOnce({
      buyerDistributionNodeId: null,
      unitPrice: 100,
      discountPercent: 0,
      baseAmount: 200,
      discountAmount: 0,
      platformFeeAmount: 40,
      buyerPayableAmount: 200,
      sellerReceivableAmount: 160,
      totalAmount: 200,
      isInNetworkTrade: false,
    });
    orderPlacementServiceMock.createOrder.mockResolvedValueOnce(
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
      shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
    });

    expect(wholesalePricingPort.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: undefined,
        quantity: 2,
      }),
    );
    expect(orderPlacementService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
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
      }),
    );
    expect(result).toMatchObject({
      buyerPayableAmount: 200,
      sellerReceivableAmount: 160,
      platformFeeAmount: 40,
    });
  });

  it('should prefer node specific policy over level and network defaults for in-network trade', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
      address: '12 Nguyen Trai, Quan 1, TP.HCM',
    });
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
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'buyer-shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });
    wholesalePricingPortMock.resolve.mockResolvedValueOnce({
      buyerDistributionNodeId: 'buyer-node-1',
      unitPrice: 85,
      discountPercent: 15,
      baseAmount: 200,
      discountAmount: 30,
      platformFeeAmount: 10,
      buyerPayableAmount: 170,
      sellerReceivableAmount: 160,
      totalAmount: 170,
      isInNetworkTrade: true,
    });
    orderPlacementServiceMock.createOrder.mockResolvedValueOnce(
      createOrderRecord({
        buyerDistributionNodeId: 'buyer-node-1',
        baseAmount: 200,
        discountAmount: 30,
        platformFeeAmount: 10,
        buyerPayableAmount: 170,
        sellerReceivableAmount: 160,
        totalAmount: 170,
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
      shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
    });

    expect(wholesalePricingPort.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-1',
        quantity: 2,
      }),
    );
    expect(orderPlacementService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          buyerDistributionNodeId: 'buyer-node-1',
          baseAmount: 200,
          discountAmount: 30,
          platformFeeAmount: 10,
          buyerPayableAmount: 170,
          sellerReceivableAmount: 160,
          totalAmount: 170,
          item: expect.objectContaining({
            unitPrice: 85,
            quantity: 2,
          }),
        }),
      }),
    );
    expect(result).toMatchObject({
      buyerDistributionNodeId: 'buyer-node-1',
      buyerPayableAmount: 170,
      sellerReceivableAmount: 160,
      discountAmount: 30,
      platformFeeAmount: 10,
    });
  });

  it('should reject non-percent policy for in-network trade', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
      address: '12 Nguyen Trai, Quan 1, TP.HCM',
    });
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
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'buyer-shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });
    wholesalePricingPortMock.resolve.mockRejectedValueOnce(
      new Error('In-network pricing policy must use percent discount'),
    );

    await expect(
      useCase.execute({
        buyerUserId: 'user-1',
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-1',
        offerId: 'offer-1',
        quantity: 1,
        shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
      }),
    ).rejects.toThrow('In-network pricing policy must use percent discount');
  });

  it('should reject in-network pricing when offer is not attached to a distribution node', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
      address: '12 Nguyen Trai, Quan 1, TP.HCM',
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        price: 100,
        salesMode: 'WHOLESALE',
        distributionNode: null,
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'buyer-shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });
    wholesalePricingPortMock.resolve.mockRejectedValueOnce(
      new Error('Only offers attached to a distribution node can use in-network pricing'),
    );

    await expect(
      useCase.execute({
        buyerUserId: 'user-1',
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-1',
        offerId: 'offer-1',
        quantity: 1,
        shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
      }),
    ).rejects.toThrow('Only offers attached to a distribution node can use in-network pricing');
  });

  it('should reject checkout for draft wholesale offers', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        offerStatus: 'draft',
      }),
    );

    await expect(
      useCase.execute({
        buyerUserId: 'user-1',
        buyerShopId: 'buyer-shop-1',
        offerId: 'offer-1',
        quantity: 1,
        shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
      }),
    ).rejects.toThrow('Only active wholesale offers can be ordered');
    expect(wholesalePricingPort.resolve).not.toHaveBeenCalled();
    expect(orderPlacementService.createOrder).not.toHaveBeenCalled();
  });

  it('should require buyer distribution node for distribution wholesale checkout', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        distributionNode: {
          id: 'seller-node-1',
          networkId: 'network-1',
          level: 1,
          relationshipStatus: 'ACTIVE',
          shop: { shopStatus: 'verified' },
        },
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'buyer-shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });

    await expect(
      useCase.execute({
        buyerUserId: 'user-1',
        buyerShopId: 'buyer-shop-1',
        offerId: 'offer-1',
        quantity: 1,
        shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
      }),
    ).rejects.toThrow('Buyer distribution node is required for distribution wholesale checkout');
    expect(wholesalePricingPort.resolve).not.toHaveBeenCalled();
    expect(orderPlacementService.createOrder).not.toHaveBeenCalled();
  });

  it('should reject distributor resale checkout when attached batch allocation is insufficient', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        shop: {
          id: 'seller-shop-1',
          shopName: 'L1 Seller',
          ownerUserId: 'seller-user-1',
          registrationType: 'DISTRIBUTOR',
        },
        distributionNode: {
          id: 'seller-node-1',
          networkId: 'network-1',
          level: 1,
          relationshipStatus: 'ACTIVE',
          shop: { shopStatus: 'verified' },
        },
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'buyer-shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });
    wholesalePricingPortMock.resolve.mockResolvedValueOnce({
      buyerDistributionNodeId: 'buyer-node-1',
      unitPrice: 90,
      discountPercent: 10,
      baseAmount: 300,
      discountAmount: 30,
      platformFeeAmount: 30,
      buyerPayableAmount: 270,
      sellerReceivableAmount: 240,
      totalAmount: 270,
      isInNetworkTrade: true,
    });
    ordersRepositoryMock.getOfferAllocatedBatchQuantity.mockResolvedValueOnce(2);

    await expect(
      useCase.execute({
        buyerUserId: 'user-1',
        buyerShopId: 'buyer-shop-1',
        buyerDistributionNodeId: 'buyer-node-1',
        offerId: 'offer-1',
        quantity: 3,
        shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
      }),
    ).rejects.toThrow('Quantity exceeds allocated resale batch stock');
    expect(orderPlacementService.createOrder).not.toHaveBeenCalled();
  });

  it('should allow distributor resale checkout with in-network pricing and enough attached batch stock', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'user-1',
      phone: '0987654321',
      displayName: 'Buyer',
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(
      createOffer({
        shop: {
          id: 'seller-shop-1',
          shopName: 'L1 Seller',
          ownerUserId: 'seller-user-1',
          registrationType: 'DISTRIBUTOR',
        },
        distributionNode: {
          id: 'seller-node-1',
          networkId: 'network-1',
          level: 1,
          relationshipStatus: 'ACTIVE',
          shop: { shopStatus: 'verified' },
        },
      }),
    );
    ordersRepositoryMock.findOwnedShop.mockResolvedValueOnce({
      id: 'buyer-shop-1',
      shopStatus: 'verified',
      registrationType: 'DISTRIBUTOR',
    });
    wholesalePricingPortMock.resolve.mockResolvedValueOnce({
      buyerDistributionNodeId: 'buyer-node-1',
      unitPrice: 90,
      discountPercent: 10,
      baseAmount: 300,
      discountAmount: 30,
      platformFeeAmount: 30,
      buyerPayableAmount: 270,
      sellerReceivableAmount: 240,
      totalAmount: 270,
      isInNetworkTrade: true,
    });
    ordersRepositoryMock.getOfferAllocatedBatchQuantity.mockResolvedValueOnce(3);
    orderPlacementServiceMock.createOrder.mockResolvedValueOnce(
      createOrderRecord({
        buyerDistributionNodeId: 'buyer-node-1',
        baseAmount: 300,
        discountAmount: 30,
        platformFeeAmount: 30,
        buyerPayableAmount: 270,
        sellerReceivableAmount: 240,
        totalAmount: 270,
        unitPrice: 90,
        quantity: 3,
      }),
    );

    const result = await useCase.execute({
      buyerUserId: 'user-1',
      buyerShopId: 'buyer-shop-1',
      buyerDistributionNodeId: 'buyer-node-1',
      offerId: 'offer-1',
      quantity: 3,
      shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
    });

    expect(ordersRepositoryMock.getOfferAllocatedBatchQuantity).toHaveBeenCalledWith('offer-1');
    expect(orderPlacementService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          buyerDistributionNodeId: 'buyer-node-1',
          item: expect.objectContaining({ quantity: 3 }),
        }),
      }),
    );
    expect(result).toMatchObject({
      buyerDistributionNodeId: 'buyer-node-1',
      buyerPayableAmount: 270,
    });
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
    offerStatus: 'active',
    productModelId: 'product-model-1',
    categoryId: 'category-1',
    shopId: 'seller-shop-1',
    shop: {
      id: 'seller-shop-1',
      shopName: 'Seller Shop',
      ownerUserId: 'seller-user-1',
      registrationType: 'MANUFACTURER',
    },
    distributionNode: null,
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
        batchAllocations: [],
        reviews: [],
      },
    ],
  };
}
