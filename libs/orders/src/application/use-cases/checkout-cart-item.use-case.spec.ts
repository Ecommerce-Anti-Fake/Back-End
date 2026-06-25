import { CheckoutCartItemUseCase } from './checkout-cart-item.use-case';

describe('CheckoutCartItemUseCase', () => {
  const ordersRepository = {
    findCartItemById: jest.fn(),
    findOfferForOrdering: jest.fn(),
    removeCartItem: jest.fn(),
  };
  const createRetailOrderUseCase = {
    execute: jest.fn(),
  };
  const createWholesaleOrderUseCase = {
    execute: jest.fn(),
  };

  let useCase: CheckoutCartItemUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new CheckoutCartItemUseCase(
      ordersRepository as never,
      createRetailOrderUseCase as never,
      createWholesaleOrderUseCase as never,
    );
  });

  it('should checkout a wholesale-only cart item as a wholesale order for a normal buyer', async () => {
    ordersRepository.findCartItemById.mockResolvedValueOnce({
      id: 'cart-item-1',
      offerId: 'offer-1',
      quantity: 10,
      cart: {
        buyerUserId: 'buyer-user-1',
        cartStatus: 'ACTIVE',
      },
    });
    ordersRepository.findOfferForOrdering.mockResolvedValueOnce({
      id: 'offer-1',
      salesMode: 'WHOLESALE',
    });
    createWholesaleOrderUseCase.execute.mockResolvedValueOnce({
      id: 'order-1',
      orderMode: 'WHOLESALE',
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

    expect(createWholesaleOrderUseCase.execute).toHaveBeenCalledWith({
      buyerUserId: 'buyer-user-1',
      offerId: 'offer-1',
      quantity: 10,
      affiliateCode: null,
      shippingName: null,
      shippingPhone: '0987654321',
      shippingAddress: '12 Nguyen Trai, Quan 1, TP.HCM',
    });
    expect(createRetailOrderUseCase.execute).not.toHaveBeenCalled();
    expect(ordersRepository.removeCartItem).toHaveBeenCalledWith({
      buyerUserId: 'buyer-user-1',
      cartItemId: 'cart-item-1',
    });
    expect(result).toMatchObject({
      id: 'order-1',
      orderMode: 'WHOLESALE',
    });
  });
});
