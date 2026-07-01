import { Prisma } from '@prisma/client';
import { CheckoutCartUseCase } from './checkout-cart.use-case';

describe('CheckoutCartUseCase', () => {
  const ordersRepository = {
    getOrCreateActiveCart: jest.fn(),
    findDefaultAddressByUserId: jest.fn(),
    removeCartItems: jest.fn(),
    createCheckoutSession: jest.fn(),
    updateCheckoutSessionPaymentProviderRef: jest.fn(),
    markOrderPaid: jest.fn(),
    markCheckoutSessionPaid: jest.fn(),
  };
  const createOrderUseCase = {
    execute: jest.fn(),
  };
  const quoteCartShippingOptionsUseCase = {
    execute: jest.fn(),
  };
  const payOSPaymentService = {
    createPaymentLink: jest.fn(),
  };

  let useCase: CheckoutCartUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new CheckoutCartUseCase(
      ordersRepository as never,
      createOrderUseCase as never,
      quoteCartShippingOptionsUseCase as never,
      payOSPaymentService as never,
    );
    ordersRepository.getOrCreateActiveCart.mockResolvedValue(createCart());
    ordersRepository.findDefaultAddressByUserId.mockResolvedValue(createDefaultAddress());
    quoteCartShippingOptionsUseCase.execute.mockResolvedValue({
      options: [
        {
          optionCode: 'GHN_1',
          providerCode: 'GHN',
          providerName: 'Giao Hang Nhanh',
          methodName: 'Nhanh',
          shippingFee: 30000,
          estimatedDelivery: '2-3 ngay',
        },
      ],
    });
  });

  it('creates orders for selected cart items and returns success for COD checkout', async () => {
    createOrderUseCase.execute
      .mockResolvedValueOnce({ id: 'order-1' })
      .mockResolvedValueOnce({ id: 'order-2' });

    const result = await useCase.execute({
      buyerUserId: 'buyer-user-1',
      cartItemIds: ['cart-item-1', 'cart-item-2'],
      paymentMethod: 'COD',
      shippingOptionCode: 'GHN_1',
    });

    expect(result).toEqual({ success: true });
    expect(createOrderUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createOrderUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({
      buyerUserId: 'buyer-user-1',
      offerId: 'offer-1',
      paymentMethod: 'COD',
      shippingProviderCode: 'GHN',
      shippingAddress: '12 Nguyen Trai',
      shippingDistrictId: 1450,
      shippingWardCode: '21211',
    }));
    expect(ordersRepository.removeCartItems).toHaveBeenCalledWith({
      buyerUserId: 'buyer-user-1',
      cartItemIds: ['cart-item-1', 'cart-item-2'],
    });
  });

  it('creates payOS checkout session and returns only session id and checkout url', async () => {
    ordersRepository.createCheckoutSession.mockResolvedValueOnce({
      id: 'checkout-session-1',
      amount: new Prisma.Decimal(130000),
    });
    payOSPaymentService.createPaymentLink.mockResolvedValueOnce({
      orderCode: 123,
      paymentLinkId: 'link-1',
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
    });

    const result = await useCase.execute({
      buyerUserId: 'buyer-user-1',
      cartItemIds: ['cart-item-1'],
      paymentMethod: 'PAYOS',
      shippingOptionCode: 'GHN_1',
    });

    expect(ordersRepository.createCheckoutSession).toHaveBeenCalledWith({
      buyerUserId: 'buyer-user-1',
      cartItemIds: ['cart-item-1'],
      shippingOptionCode: 'GHN_1',
      paymentMethod: 'PAYOS',
      amount: 130000,
    });
    expect(ordersRepository.updateCheckoutSessionPaymentProviderRef).toHaveBeenCalledWith({
      checkoutSessionId: 'checkout-session-1',
      paymentProviderRef: 'PAYOS:link-1',
      payOSOrderCode: 123,
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
    });
    expect(result).toEqual({
      checkoutSessionId: 'checkout-session-1',
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
    });
    expect(createOrderUseCase.execute).not.toHaveBeenCalled();
    expect(ordersRepository.removeCartItems).not.toHaveBeenCalled();
  });

  function createCart() {
    return {
      id: 'cart-1',
      buyerUserId: 'buyer-user-1',
      cartStatus: 'ACTIVE',
      items: [
        createCartItem({ id: 'cart-item-1', offerId: 'offer-1', price: 100000, quantity: 1 }),
        createCartItem({ id: 'cart-item-2', offerId: 'offer-2', price: 200000, quantity: 2 }),
      ],
    };
  }

  function createCartItem(input: { id: string; offerId: string; price: number; quantity: number }) {
    return {
      id: input.id,
      offerId: input.offerId,
      quantity: input.quantity,
      offer: {
        id: input.offerId,
        title: `Offer ${input.offerId}`,
        price: new Prisma.Decimal(input.price),
      },
    };
  }

  function createDefaultAddress() {
    return {
      recipientName: 'Nguyen Van A',
      phone: '0987654321',
      addressLine: '12 Nguyen Trai',
      wardCode: 'VN-P202-D1450-W21211',
      wardName: 'Phuong Ben Nghe',
    };
  }
});
