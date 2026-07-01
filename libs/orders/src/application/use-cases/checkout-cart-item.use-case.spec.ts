import { CheckoutCartItemUseCase } from './checkout-cart-item.use-case';

describe('CheckoutCartItemUseCase', () => {
  const ordersRepository = {
    findCartItemById: jest.fn(),
    findOfferForOrdering: jest.fn(),
    removeCartItem: jest.fn(),
  };
  const createOrderUseCase = {
    execute: jest.fn(),
  };

  let useCase: CheckoutCartItemUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new CheckoutCartItemUseCase(
      ordersRepository as never,
      createOrderUseCase as never,
    );
  });

  it('should checkout a cart item through the unified order flow', async () => {
    ordersRepository.findCartItemById.mockResolvedValueOnce({
      id: 'cart-item-1',
      offerId: 'offer-1',
      quantity: 10,
      cart: {
        buyerUserId: 'buyer-user-1',
        cartStatus: 'ACTIVE',
      },
    });
    ordersRepository.findOfferForOrdering.mockResolvedValueOnce({ id: 'offer-1' });
    createOrderUseCase.execute.mockResolvedValueOnce({
      id: 'order-1',
      buyerUserId: 'buyer-user-1',
      buyerShopId: null,
      buyerDistributionNodeId: null,
    });

    const result = await useCase.execute({
      buyerUserId: 'buyer-user-1',
      cartItemId: 'cart-item-1',
      shippingPhone: '0987654321',
      shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
    });

    expect(createOrderUseCase.execute).toHaveBeenCalledWith({
      buyerUserId: 'buyer-user-1',
      offerId: 'offer-1',
      quantity: 10,
      paymentMethod: 'COD',
      affiliateCode: null,
      shippingName: null,
      shippingPhone: '0987654321',
      shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
      shippingDistrictId: null,
      shippingDistrictName: null,
      shippingWardCode: null,
      shippingWardName: null,
      shippingProviderCode: null,
      shippingServiceId: null,
      shippingServiceTypeId: null,
    });
    expect(ordersRepository.removeCartItem).toHaveBeenCalledWith({
      buyerUserId: 'buyer-user-1',
      cartItemId: 'cart-item-1',
    });
    expect(result).toMatchObject({ id: 'order-1' });
  });
});
