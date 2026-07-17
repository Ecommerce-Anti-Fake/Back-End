import { CheckoutShippingService } from '../services';
import { QuoteBuyNowShippingOptionsUseCase } from './quote-buy-now-shipping-options.use-case';

describe('QuoteBuyNowShippingOptionsUseCase', () => {
  it('quotes one offer item and returns only public shipping fields', async () => {
    const offer = {
      id: 'offer-1', offerStatus: 'active', moderationStatus: 'approved',
      availableQuantity: 5, price: { toString: () => '150000' },
      shop: { id: 'shop-1', shopName: 'Shop', warehouseAddress: null, warehouseWardCode: null, warehouseWardName: null },
    };
    const ordersRepository = {
      findOfferForOrdering: jest.fn().mockResolvedValue(offer),
      countOfferVariants: jest.fn().mockResolvedValue(1),
      findOfferVariantForOrdering: jest.fn().mockResolvedValue({
        id: 'variant-1',
        offerId: 'offer-1',
        price: { toString: () => '150000' },
        availableQuantity: 5,
        isActive: true,
      }),
    };
    const internalOption = {
      optionCode: 'GHN_1', providerCode: 'GHN', providerName: 'GHN', methodName: 'Standard',
      shippingFee: 30000, estimatedDelivery: '2-3 days', shippingServiceId: 1, shippingServiceTypeId: 2,
    };
    const checkoutShippingService = {
      quoteOptionsForItems: jest.fn().mockResolvedValue({ options: [internalOption] }),
      toPublicOptions: jest.fn().mockReturnValue([{ ...internalOption, shippingServiceId: undefined, shippingServiceTypeId: undefined }]),
    };
    const useCase = new QuoteBuyNowShippingOptionsUseCase(
      ordersRepository as never, checkoutShippingService as unknown as CheckoutShippingService,
    );

    await useCase.execute({
      buyerUserId: 'buyer-1',
      offerId: 'offer-1',
      variantId: 'variant-1',
      quantity: 2,
    });

    expect(checkoutShippingService.quoteOptionsForItems).toHaveBeenCalledWith({
      buyerUserId: 'buyer-1',
      items: [{ offerId: 'offer-1', quantity: 2, unitPrice: 150000, offer }],
    });
    expect(checkoutShippingService.toPublicOptions).toHaveBeenCalledWith([internalOption]);
  });
});
