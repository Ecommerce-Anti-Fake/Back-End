import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CheckoutShippingService } from '../services';
import { BuyNowCheckoutUseCase } from './buy-now-checkout.use-case';
import { CreateOrderUseCase } from './create-order.use-case';

describe('BuyNowCheckoutUseCase', () => {
  const ordersRepository = {
    findOfferForOrdering: jest.fn(),
    countOfferVariants: jest.fn(),
    findOfferVariantForOrdering: jest.fn(),
    upsertCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    removeCartItems: jest.fn(),
  };
  const checkoutShippingService = {
    resolveSelectedOption: jest.fn(),
    resolveDefaultShipping: jest.fn(),
  };
  const createOrderUseCase = {
    execute: jest.fn(),
  };
  let useCase: BuyNowCheckoutUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new BuyNowCheckoutUseCase(
      ordersRepository as unknown as OrdersRepository,
      checkoutShippingService as unknown as CheckoutShippingService,
      createOrderUseCase as unknown as CreateOrderUseCase,
    );
    ordersRepository.countOfferVariants.mockResolvedValue(1);
    ordersRepository.findOfferVariantForOrdering.mockResolvedValue({
      id: 'variant-1',
      offerId: 'offer-1',
      price: new Prisma.Decimal(100000),
      availableQuantity: 100,
      isActive: true,
    });
    ordersRepository.findOfferForOrdering.mockResolvedValue(createOffer());
    checkoutShippingService.resolveSelectedOption.mockResolvedValue({
      optionCode: 'GHN_1',
      providerCode: 'GHN',
      providerName: 'Giao Hang Nhanh',
      methodName: 'Nhanh',
      shippingFee: 30000,
      estimatedDelivery: '2-3 ngay',
      shippingServiceId: 53320,
      shippingServiceTypeId: 2,
    });
    checkoutShippingService.resolveDefaultShipping.mockResolvedValue({
      name: 'Buyer',
      phone: '0900000000',
      address: '12 Nguyen Trai',
      districtId: 1450,
      districtName: null,
      wardCode: '21211',
      wardName: 'Phuong Ben Nghe',
    });
    createOrderUseCase.execute.mockResolvedValue({
      id: 'order-1',
      payOSCheckoutUrl: 'https://pay.payos.vn/web/link-1',
    });
  });

  it.each([
    ['cart has same offer x1', 1],
    ['cart has same offer x5', 2],
    ['cart is empty', 3],
  ])('delegates checkout from Buy Now quantity only when %s', async (_label, quantity) => {
    const result = await useCase.execute({
      buyerUserId: 'buyer-1',
      offerId: 'offer-1',
      variantId: 'variant-1',
      quantity,
      paymentMethod: 'PAYOS',
      shippingOptionCode: 'GHN_1',
    });

    expect(result).toEqual({
      id: 'order-1',
      payOSCheckoutUrl: 'https://pay.payos.vn/web/link-1',
    });
    expect(checkoutShippingService.resolveSelectedOption).toHaveBeenCalledWith({
      buyerUserId: 'buyer-1',
      shippingOptionCode: 'GHN_1',
      items: [
        expect.objectContaining({
          offerId: 'offer-1',
          quantity,
          unitPrice: 100000,
        }),
      ],
    });
    expect(createOrderUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerUserId: 'buyer-1',
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity,
        paymentMethod: 'PAYOS',
        shippingName: 'Buyer',
        shippingPhone: '0900000000',
        shippingAddress: '12 Nguyen Trai',
        shippingDistrictId: 1450,
        shippingWardCode: '21211',
        shippingProviderCode: 'GHN',
        shippingServiceId: 53320,
        shippingServiceTypeId: 2,
      }),
    );
    expect(ordersRepository.upsertCartItem).not.toHaveBeenCalled();
    expect(ordersRepository.removeCartItem).not.toHaveBeenCalled();
    expect(ordersRepository.removeCartItems).not.toHaveBeenCalled();
  });

  it('uses selected variant price for shipping quote and order creation', async () => {
    ordersRepository.findOfferVariantForOrdering.mockResolvedValue({
      id: 'variant-1',
      offerId: 'offer-1',
      price: new Prisma.Decimal(120000),
      availableQuantity: 5,
      isActive: true,
    });

    await useCase.execute({
      buyerUserId: 'buyer-1',
      offerId: 'offer-1',
      variantId: 'variant-1',
      quantity: 2,
      paymentMethod: 'COD',
      shippingOptionCode: 'GHN_1',
    });

    expect(checkoutShippingService.resolveSelectedOption).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            unitPrice: 120000,
            quantity: 2,
          }),
        ],
      }),
    );
    expect(createOrderUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ variantId: 'variant-1' }));
  });

  it('rejects unavailable quantity before resolving shipping', async () => {
    ordersRepository.findOfferVariantForOrdering.mockResolvedValue({
      id: 'variant-1',
      offerId: 'offer-1',
      price: new Prisma.Decimal(100000),
      availableQuantity: 1,
      isActive: true,
    });

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1',
        offerId: 'offer-1',
        variantId: 'variant-1',
        quantity: 2,
        paymentMethod: 'PAYOS',
        shippingOptionCode: 'GHN_1',
      }),
    ).rejects.toThrow('Số lượng vượt quá tồn kho.');

    expect(checkoutShippingService.resolveSelectedOption).not.toHaveBeenCalled();
    expect(createOrderUseCase.execute).not.toHaveBeenCalled();
  });

  function createOffer(overrides: { availableQuantity?: number } = {}) {
    return {
      id: 'offer-1',
      title: 'Offer 1',
      offerStatus: 'active',
      price: new Prisma.Decimal(100000),
      availableQuantity: overrides.availableQuantity ?? 100,
      shopId: 'shop-1',
      brandId: 'brand-1',
      shop: {
        id: 'shop-1',
        shopName: 'Shop 1',
        registrationType: 'NORMAL',
        warehouseAddress: 'Warehouse',
        warehouseWardCode: 'VN-P202-D1442-W20101',
        warehouseWardName: 'Ward',
      },
      parcelWeightGrams: 500,
      parcelLengthCm: 30,
      parcelWidthCm: 15,
      parcelHeightCm: 8,
    };
  }
});
