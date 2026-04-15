import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CreateRetailOrderUseCase } from './create-retail-order.use-case';

describe('CreateRetailOrderUseCase', () => {
  let useCase: CreateRetailOrderUseCase;

  const ordersRepositoryMock = {
    findOfferForOrdering: jest.fn(),
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRetailOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
      ],
    }).compile();

    useCase = module.get<CreateRetailOrderUseCase>(CreateRetailOrderUseCase);
  });

  it('should pass affiliate attribution when affiliate code is provided', async () => {
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce({
      id: 'offer-1',
      title: 'Offer 1',
      price: new Prisma.Decimal(100),
      availableQuantity: 20,
      salesMode: 'BOTH',
      minWholesaleQty: null,
      verificationLevel: 'SERIALIZED',
      productModelId: 'product-model-1',
      categoryId: 'category-1',
      shopId: 'seller-shop-1',
      shop: {
        id: 'seller-shop-1',
        shopName: 'Seller Shop',
        ownerUserId: 'seller-user-1',
      },
      productModel: {
        brandId: 'brand-1',
      },
      distributionNode: null,
    });
    ordersRepositoryMock.createOrder.mockResolvedValueOnce({
      id: 'order-1',
      orderMode: 'RETAIL',
      orderStatus: 'pending',
      shopId: 'seller-shop-1',
      buyerUserId: 'buyer-user-1',
      buyerShopId: null,
      buyerDistributionNodeId: null,
      baseAmount: new Prisma.Decimal(200),
      discountAmount: new Prisma.Decimal(0),
      platformFeeAmount: new Prisma.Decimal(40),
      buyerPayableAmount: new Prisma.Decimal(200),
      sellerReceivableAmount: new Prisma.Decimal(160),
      totalAmount: new Prisma.Decimal(200),
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
      shop: {
        shopName: 'Seller Shop',
        ownerUserId: 'seller-user-1',
      },
      buyerShop: null,
      items: [
        {
          offerId: 'offer-1',
          offerTitleSnapshot: 'Offer 1',
          unitPrice: new Prisma.Decimal(100),
          quantity: 2,
          verificationLevelSnapshot: 'SERIALIZED',
        },
      ],
    });

    const result = await useCase.execute({
      buyerUserId: 'buyer-user-1',
      offerId: 'offer-1',
      quantity: 2,
      affiliateCode: 'spring-aff-001',
    });

    expect(ordersRepositoryMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerUserId: 'buyer-user-1',
        baseAmount: 200,
        platformFeeAmount: 40,
        affiliateAttribution: {
          affiliateCode: 'spring-aff-001',
          customerUserId: 'buyer-user-1',
          offerId: 'offer-1',
          sellerShopId: 'seller-shop-1',
          brandId: 'brand-1',
          productModelId: 'product-model-1',
          orderAmount: 200,
          commissionBase: 40,
        },
      }),
    );
    expect(result).toMatchObject({
      id: 'order-1',
      totalAmount: 200,
      platformFeeAmount: 40,
    });
  });
});
