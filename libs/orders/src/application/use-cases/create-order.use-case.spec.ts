import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { WholesalePricingPort } from '../ports';
import { OrderNotificationService, OrderPlacementService, PayOSPaymentService, ShippingCarrierAdapterService } from '../services';
import { CreateOrderUseCase } from './create-order.use-case';
import { PayOrderByWalletUseCase } from './pay-order-by-wallet.use-case';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  const ordersRepository = {
    findUserById: jest.fn(),
    findOfferForOrdering: jest.fn(),
    findOwnedShop: jest.fn(),
    getOfferAllocatedBatchQuantity: jest.fn(),
    findActiveShippingCarriers: jest.fn(),
    countOfferVariants: jest.fn(),
    findOfferVariantForOrdering: jest.fn(),
    updatePaymentProviderRef: jest.fn(),
    upsertCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    removeCartItems: jest.fn(),
  };
  const orderPlacementService = { createOrder: jest.fn() };
  const wholesalePricing = { resolve: jest.fn() };
  const payOSPaymentService = { createPaymentLink: jest.fn() };
  const shippingCarrierAdapter = { quoteShipment: jest.fn() };
  const orderNotificationService = { notifyCreated: jest.fn() };
  const payOrderByWalletUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    ordersRepository.findActiveShippingCarriers.mockResolvedValue([
      { code: 'GHN', name: 'Giao Hang Nhanh', shippingFee: new Prisma.Decimal(0) },
    ]);
    ordersRepository.countOfferVariants.mockResolvedValue(0);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: OrderPlacementService, useValue: orderPlacementService },
        { provide: WholesalePricingPort, useValue: wholesalePricing },
        { provide: PayOSPaymentService, useValue: payOSPaymentService },
        { provide: ShippingCarrierAdapterService, useValue: shippingCarrierAdapter },
        { provide: OrderNotificationService, useValue: orderNotificationService },
        { provide: PayOrderByWalletUseCase, useValue: payOrderByWalletUseCase },
      ],
    }).compile();
    useCase = module.get(CreateOrderUseCase);
  });

  it('treats quantity as the number of offer lots without a sales mode', async () => {
    ordersRepository.findUserById.mockResolvedValue({ displayName: 'Buyer', phone: '0900000000' });
    ordersRepository.findOfferForOrdering.mockResolvedValue({
      id: 'offer-1',
      title: 'Lo 30 mat na',
      offerStatus: 'active',
      price: new Prisma.Decimal(100000),
      availableQuantity: 100,
      shopId: 'shop-1',
      brandId: 'brand-1',
      shop: { registrationType: 'NORMAL' },
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
    });
    shippingCarrierAdapter.quoteShipment.mockResolvedValue({
      shippingFeeAmount: 0,
      serviceId: null,
      serviceTypeId: null,
    });
    orderPlacementService.createOrder.mockImplementation(async ({ order }: any) => ({
      id: 'order-1',
      ...order,
      createdAt: new Date(),
      shop: { shopName: 'Shop', ownerUserId: 'seller-1' },
      buyerShop: null,
      items: [{ id: 'item-1', ...order.item, batchAllocations: [], reviews: [], offer: { media: [] } }],
    }));

    await useCase.execute({
      buyerUserId: 'buyer-1',
      offerId: 'offer-1',
      quantity: 1,
      shippingAddress: 'HCM',
    });

    expect(orderPlacementService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          baseAmount: 100000,
          item: expect.objectContaining({ quantity: 1, offerTitleSnapshot: 'Lo 30 mat na' }),
        }),
      }),
    );
    expect(orderNotificationService.notifyCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'order-1' }));
  });

  it.each([
    ['cart has the same offer x1', 1, 1],
    ['cart has the same offer x5', 5, 2],
    ['cart is empty', 0, 3],
  ])('creates Buy Now PayOS order from request quantity when %s', async (_label, _cartQuantity, buyNowQuantity) => {
    ordersRepository.findUserById.mockResolvedValue({ displayName: 'Buyer', phone: '0900000000' });
    ordersRepository.findOfferForOrdering.mockResolvedValue({
      id: 'offer-1',
      title: 'Lo 30 mat na',
      offerStatus: 'active',
      price: new Prisma.Decimal(100000),
      availableQuantity: 100,
      shopId: 'shop-1',
      brandId: 'brand-1',
      shop: { registrationType: 'NORMAL' },
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
    });
    shippingCarrierAdapter.quoteShipment.mockResolvedValue({
      shippingFeeAmount: 0,
      serviceId: null,
      serviceTypeId: null,
    });
    orderPlacementService.createOrder.mockImplementation(async ({ order }: any) => ({
      id: 'order-1',
      ...order,
      createdAt: new Date(),
      shop: { shopName: 'Shop', ownerUserId: 'seller-1' },
      buyerShop: null,
      paymentIntent: { paymentMethod: 'PAYOS', paymentStatus: 'PENDING', providerRef: null },
      escrow: null,
      disputes: [],
      shopGroups: [],
      items: [{ id: 'item-1', ...order.item, batchAllocations: [], reviews: [], offer: { media: [] } }],
    }));
    payOSPaymentService.createPaymentLink.mockResolvedValue({
      paymentLinkId: 'link-1',
      orderCode: 1776240000123,
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
    });

    await useCase.execute({
      buyerUserId: 'buyer-1',
      offerId: 'offer-1',
      quantity: buyNowQuantity,
      paymentMethod: 'PAYOS',
      shippingAddress: 'HCM',
    });

    expect(orderPlacementService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          baseAmount: 100000 * buyNowQuantity,
          buyerPayableAmount: 100000 * buyNowQuantity,
          item: expect.objectContaining({ quantity: buyNowQuantity }),
        }),
      }),
    );
    expect(payOSPaymentService.createPaymentLink).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100000 * buyNowQuantity,
        quantity: buyNowQuantity,
      }),
    );
    expect(ordersRepository.upsertCartItem).not.toHaveBeenCalled();
    expect(ordersRepository.removeCartItem).not.toHaveBeenCalled();
    expect(ordersRepository.removeCartItems).not.toHaveBeenCalled();
  });

  it('uses the selected active variant price and stock for Buy Now checkout', async () => {
    ordersRepository.findUserById.mockResolvedValue({ displayName: 'Buyer', phone: '0900000000' });
    ordersRepository.findOfferForOrdering.mockResolvedValue({
      id: 'offer-1',
      title: 'Lo 30 mat na',
      offerStatus: 'active',
      price: new Prisma.Decimal(100000),
      availableQuantity: 100,
      shopId: 'shop-1',
      brandId: 'brand-1',
      shop: { registrationType: 'NORMAL' },
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
    });
    ordersRepository.findOfferVariantForOrdering.mockResolvedValue({
      id: 'variant-1',
      offerId: 'offer-1',
      price: new Prisma.Decimal(120000),
      availableQuantity: 2,
      isActive: true,
    });
    shippingCarrierAdapter.quoteShipment.mockResolvedValue({
      shippingFeeAmount: 0,
      serviceId: null,
      serviceTypeId: null,
    });
    orderPlacementService.createOrder.mockImplementation(async ({ order }: any) => ({
      id: 'order-1',
      ...order,
      createdAt: new Date(),
      shop: { shopName: 'Shop', ownerUserId: 'seller-1' },
      buyerShop: null,
      items: [{ id: 'item-1', ...order.item, batchAllocations: [], reviews: [], offer: { media: [] } }],
    }));

    await useCase.execute({
      buyerUserId: 'buyer-1',
      offerId: 'offer-1',
      variantId: 'variant-1',
      quantity: 2,
      shippingAddress: 'HCM',
    });

    expect(orderPlacementService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          baseAmount: 240000,
          item: expect.objectContaining({
            variantId: 'variant-1',
            unitPrice: 120000,
            quantity: 2,
          }),
        }),
      }),
    );
  });
});
