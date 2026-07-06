import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { WholesalePricingPort } from '../ports';
import { OrderNotificationService, OrderPlacementService, PayOSPaymentService, ShippingCarrierAdapterService } from '../services';
import { CreateOrderUseCase } from './create-order.use-case';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  const ordersRepository = {
    findUserById: jest.fn(),
    findOfferForOrdering: jest.fn(),
    findOwnedShop: jest.fn(),
    getOfferAllocatedBatchQuantity: jest.fn(),
    findActiveShippingCarriers: jest.fn(),
  };
  const orderPlacementService = { createOrder: jest.fn() };
  const wholesalePricing = { resolve: jest.fn() };
  const payOSPaymentService = { createPaymentLink: jest.fn() };
  const shippingCarrierAdapter = { quoteShipment: jest.fn() };
  const orderNotificationService = { notifyCreated: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    ordersRepository.findActiveShippingCarriers.mockResolvedValue([
      { code: 'GHN', name: 'Giao Hang Nhanh' },
    ]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderUseCase,
        { provide: OrdersRepository, useValue: ordersRepository },
        { provide: OrderPlacementService, useValue: orderPlacementService },
        { provide: WholesalePricingPort, useValue: wholesalePricing },
        { provide: PayOSPaymentService, useValue: payOSPaymentService },
        { provide: ShippingCarrierAdapterService, useValue: shippingCarrierAdapter },
        { provide: OrderNotificationService, useValue: orderNotificationService },
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
      verificationLevel: 'standard',
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
});
