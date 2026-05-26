import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderPlacementService, PayOSPaymentService, ShippingCarrierAdapterService } from '../services';
import { CreateRetailOrderUseCase } from './create-retail-order.use-case';

describe('CreateRetailOrderUseCase', () => {
  let useCase: CreateRetailOrderUseCase;

  const ordersRepositoryMock = {
    findUserById: jest.fn(),
    findOfferForOrdering: jest.fn(),
  };
  const orderPlacementServiceMock = {
    createOrder: jest.fn(),
  };
  const payOSPaymentServiceMock = {
    createPaymentLink: jest.fn(),
  };
  const shippingCarrierAdapterMock = {
    quoteShipment: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateRetailOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderPlacementService, useValue: orderPlacementServiceMock },
        { provide: PayOSPaymentService, useValue: payOSPaymentServiceMock },
        { provide: ShippingCarrierAdapterService, useValue: shippingCarrierAdapterMock },
      ],
    }).compile();

    useCase = module.get<CreateRetailOrderUseCase>(CreateRetailOrderUseCase);
  });

  it('should pass affiliate attribution when affiliate code is provided', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'buyer-user-1',
      phone: '0987654321',
      displayName: 'Buyer',
      address: '12 Nguyen Trai, Quan 1, TP.HCM',
    });
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
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
      shippingMethods: [
        {
          providerCode: 'SELF_DELIVERY',
          providerName: 'Seller tu giao',
          shippingFee: new Prisma.Decimal(0),
          estimatedDays: null,
          isEnabled: true,
        },
        {
          providerCode: 'GHN',
          providerName: 'Giao Hang Nhanh',
          shippingFee: new Prisma.Decimal(25000),
          estimatedDays: '2-3 ngay',
          isEnabled: true,
        },
      ],
      distributionNode: null,
    });
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 25000,
      serviceId: null,
      serviceTypeId: 2,
    });
    orderPlacementServiceMock.createOrder.mockResolvedValueOnce({
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
      totalAmount: new Prisma.Decimal(25200),
      shippingProviderCode: 'GHN',
      shippingProviderName: 'Giao Hang Nhanh',
      shippingServiceTypeId: 2,
      shippingFeeAmount: new Prisma.Decimal(25000),
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
      createdAt: new Date('2026-04-14T10:00:00.000Z'),
      shop: {
        shopName: 'Seller Shop',
        ownerUserId: 'seller-user-1',
      },
      buyerShop: null,
      items: [
        {
          id: 'order-item-1',
          offerId: 'offer-1',
          offerTitleSnapshot: 'Offer 1',
          unitPrice: new Prisma.Decimal(100),
          quantity: 2,
          verificationLevelSnapshot: 'SERIALIZED',
          batchAllocations: [],
          reviews: [],
          offer: { media: [] },
        },
      ],
    });

    const result = await useCase.execute({
      buyerUserId: 'buyer-user-1',
      offerId: 'offer-1',
      quantity: 2,
      affiliateCode: 'spring-aff-001',
      shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
      shippingDistrictId: 1450,
      shippingDistrictName: 'Quan 1',
      shippingWardCode: '21211',
      shippingWardName: 'Phuong Ben Nghe',
      shippingProviderCode: 'GHN',
    });

    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCode: 'GHN',
        shippingDistrictId: 1450,
        shippingWardCode: '21211',
        parcelWeightGrams: 500,
      }),
    );
    expect(orderPlacementServiceMock.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          buyerUserId: 'buyer-user-1',
          baseAmount: 200,
          buyerPayableAmount: 25200,
          platformFeeAmount: 40,
          shippingProviderCode: 'GHN',
          shippingProviderName: 'Giao Hang Nhanh',
          shippingDistrictId: 1450,
          shippingWardCode: '21211',
          shippingServiceTypeId: 2,
          shippingFeeAmount: 25000,
          parcelWeightGrams: 500,
        }),
        affiliateAttribution: {
          affiliateCode: 'spring-aff-001',
          customerUserId: 'buyer-user-1',
          offerId: 'offer-1',
          sellerShopId: 'seller-shop-1',
          brandId: 'brand-1',
          productModelId: 'product-model-1',
          orderAmount: 25200,
          commissionBase: 40,
        },
      }),
    );
    expect(result).toMatchObject({
      id: 'order-1',
      totalAmount: 25200,
      platformFeeAmount: 40,
      shippingProviderCode: 'GHN',
    });
  });

  it('should reject shipping providers that are not enabled for the offer', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'buyer-user-1',
      phone: '0987654321',
      displayName: 'Buyer',
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce({
      id: 'offer-1',
      title: 'Offer 1',
      price: new Prisma.Decimal(100),
      availableQuantity: 20,
      salesMode: 'RETAIL',
      minWholesaleQty: null,
      verificationLevel: 'SERIALIZED',
      productModelId: 'product-model-1',
      categoryId: 'category-1',
      shopId: 'seller-shop-1',
      productModel: { brandId: 'brand-1' },
      shippingMethods: [
        {
          providerCode: 'SELF_DELIVERY',
          providerName: 'Seller tu giao',
          shippingFee: new Prisma.Decimal(0),
          estimatedDays: null,
          isEnabled: true,
        },
      ],
      distributionNode: null,
    });

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-user-1',
        offerId: 'offer-1',
        quantity: 1,
        shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
        shippingProviderCode: 'GHN',
      }),
    ).rejects.toThrow('Shipping provider is not enabled for this offer');
  });

  it('should require buyer phone before creating order', async () => {
    ordersRepositoryMock.findUserById.mockResolvedValueOnce({
      id: 'buyer-user-1',
      phone: null,
      displayName: 'Buyer',
      address: '12 Nguyen Trai, Quan 1, TP.HCM',
    });

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-user-1',
        offerId: 'offer-1',
        quantity: 1,
      }),
    ).rejects.toThrow('Shipping contact phone is required before creating an order');
  });
});
