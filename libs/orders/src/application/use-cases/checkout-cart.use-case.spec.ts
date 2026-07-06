import { Prisma } from '@prisma/client';
import { CheckoutCartUseCase } from './checkout-cart.use-case';

describe('CheckoutCartUseCase', () => {
  const ordersRepository = {
    getOrCreateActiveCart: jest.fn(),
    findDefaultAddressByUserId: jest.fn(),
    removeCartItems: jest.fn(),
    updatePaymentProviderRef: jest.fn(),
    markOrderPaymentFailed: jest.fn(),
  };
  const orderPlacementService = { createAggregateOrder: jest.fn() };
  const quoteCartShippingOptionsUseCase = { execute: jest.fn() };
  const payOSPaymentService = { createPaymentLink: jest.fn() };
  const orderNotificationService = { notifyCreated: jest.fn() };
  let useCase: CheckoutCartUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new CheckoutCartUseCase(
      ordersRepository as never,
      orderPlacementService as never,
      quoteCartShippingOptionsUseCase as never,
      payOSPaymentService as never,
      orderNotificationService as never,
    );
    ordersRepository.getOrCreateActiveCart.mockResolvedValue(createCart());
    ordersRepository.findDefaultAddressByUserId.mockResolvedValue({
      recipientName: 'Nguyen Van A',
      phone: '0987654321',
      addressLine: '12 Nguyen Trai',
      wardCode: 'VN-P202-D1450-W21211',
      wardName: 'Phuong Ben Nghe',
    });
    quoteCartShippingOptionsUseCase.execute.mockResolvedValue({
      options: [
        {
          optionCode: 'GHN_1',
          providerCode: 'GHN',
          providerName: 'GHN',
          methodName: 'Nhanh',
          shippingFee: 30000,
          estimatedDelivery: null,
        },
      ],
    });
    orderPlacementService.createAggregateOrder.mockResolvedValue({
      id: 'order-1',
    });
  });

  it('creates one COD order with shop groups and removes source cart items', async () => {
    const result = await useCase.execute({
      buyerUserId: 'buyer-1',
      cartItemIds: ['cart-item-1', 'cart-item-2'],
      paymentMethod: 'COD',
      shippingOptionCode: 'GHN_1',
    });

    expect(result).toEqual({ success: true, orderId: 'order-1' });
    expect(orderPlacementService.createAggregateOrder).toHaveBeenCalledTimes(1);
    expect(orderPlacementService.createAggregateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerUserId: 'buyer-1',
        paymentMethod: 'COD',
        buyerPayableAmount: 530000,
        groups: expect.arrayContaining([
          expect.objectContaining({
            shopId: 'shop-1',
            items: [expect.objectContaining({ sourceCartItemId: 'cart-item-1' })],
          }),
          expect.objectContaining({
            shopId: 'shop-2',
            items: [expect.objectContaining({ sourceCartItemId: 'cart-item-2' })],
          }),
        ]),
      }),
    );
    expect(ordersRepository.removeCartItems).toHaveBeenCalledWith({
      buyerUserId: 'buyer-1',
      cartItemIds: ['cart-item-1', 'cart-item-2'],
    });
    expect(orderNotificationService.notifyCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'order-1' }));
  });

  it('creates one pending PayOS order and keeps cart items until webhook success', async () => {
    payOSPaymentService.createPaymentLink.mockResolvedValue({
      paymentLinkId: 'link-1',
      orderCode: 1776240000123,
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
    });
    const result = await useCase.execute({
      buyerUserId: 'buyer-1',
      cartItemIds: ['cart-item-1', 'cart-item-2'],
      paymentMethod: 'PAYOS',
      shippingOptionCode: 'GHN_1',
    });

    expect(result).toEqual({
      orderId: 'order-1',
      orderCode: 1776240000123,
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
    });
    expect(orderPlacementService.createAggregateOrder).toHaveBeenCalledTimes(1);
    expect(ordersRepository.updatePaymentProviderRef).toHaveBeenCalledWith('order-1', 'PAYOS:link-1');
    expect(ordersRepository.removeCartItems).not.toHaveBeenCalled();
  });

  it('marks the order payment failed when payOS link creation fails', async () => {
    payOSPaymentService.createPaymentLink.mockRejectedValue(new Error('provider unavailable'));

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1', cartItemIds: ['cart-item-1'], paymentMethod: 'PAYOS', shippingOptionCode: 'GHN_1',
      }),
    ).rejects.toThrow('provider unavailable');

    expect(ordersRepository.markOrderPaymentFailed).toHaveBeenCalledWith({
      id: 'order-1', actorUserId: 'buyer-1', providerRef: null, reason: 'Unable to create payOS payment link',
    });
    expect(ordersRepository.removeCartItems).not.toHaveBeenCalled();
  });

  function createCartItem(id: string, offerId: string, shopId: string, price: number, quantity: number) {
    return {
      id,
      offerId,
      quantity,
      offerTitleSnapshot: offerId,
      unitPriceSnapshot: new Prisma.Decimal(price),
      offer: {
        id: offerId,
        shopId,
        title: offerId,
        verificationLevel: 'basic',
        price: new Prisma.Decimal(price),
        shop: { id: shopId },
      },
    };
  }

  function createCart() {
    return {
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem('cart-item-1', 'offer-1', 'shop-1', 100000, 1), createCartItem('cart-item-2', 'offer-2', 'shop-2', 200000, 2)],
    };
  }
});
