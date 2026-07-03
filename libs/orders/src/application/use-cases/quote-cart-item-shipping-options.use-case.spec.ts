import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';
import { QuoteCartItemShippingOptionsUseCase } from './quote-cart-item-shipping-options.use-case';

describe('QuoteCartItemShippingOptionsUseCase', () => {
  const ordersRepositoryMock = {
    findCartItemById: jest.fn(),
    findOfferForOrdering: jest.fn(),
    findActiveShippingCarriers: jest.fn(),
  };
  const shippingCarrierAdapterMock = {
    listGhnServices: jest.fn(),
    quoteShipment: jest.fn(),
  };
  let useCase: QuoteCartItemShippingOptionsUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    ordersRepositoryMock.findActiveShippingCarriers.mockResolvedValue([
      { code: 'GHN', name: 'Giao Hang Nhanh', description: null },
    ]);
    useCase = new QuoteCartItemShippingOptionsUseCase(
      ordersRepositoryMock as unknown as OrdersRepository,
      shippingCarrierAdapterMock as unknown as ShippingCarrierAdapterService,
    );
  });

  it('quotes enabled provider options for a cart item', async () => {
    ordersRepositoryMock.findCartItemById.mockResolvedValueOnce({
      id: 'cart-item-1',
      offerId: 'offer-1',
      quantity: 2,
      cart: { buyerUserId: 'buyer-1', cartStatus: 'ACTIVE' },
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(createOffer());
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Hang nhe' },
    ]);
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 31000,
      serviceId: 53320,
      serviceTypeId: 2,
    });

    const result = await useCase.execute({
      buyerUserId: 'buyer-1',
      cartItemId: 'cart-item-1',
      shippingAddress: '12 Nguyen Trai',
      shippingDistrictId: 1450,
      shippingWardCode: '21211',
    });

    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCode: 'GHN',
        shippingDistrictId: 1450,
        shippingWardCode: '21211',
        shippingServiceId: 53320,
        shippingServiceTypeId: 2,
        declaredValue: 400000,
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({ providerCode: 'GHN', shippingFee: 31000, shippingServiceId: 53320 }),
    ]);
  });

  it('rejects inactive or foreign cart items', async () => {
    ordersRepositoryMock.findCartItemById.mockResolvedValueOnce(null);

    await expect(useCase.execute({ buyerUserId: 'buyer-1', cartItemId: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires parcel snapshot for GHN quote', async () => {
    ordersRepositoryMock.findCartItemById.mockResolvedValueOnce({
      id: 'cart-item-1',
      offerId: 'offer-1',
      quantity: 1,
      cart: { buyerUserId: 'buyer-1', cartStatus: 'ACTIVE' },
    });
    ordersRepositoryMock.findOfferForOrdering.mockResolvedValueOnce(createOffer({ parcelWeightGrams: null }));
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([{ serviceId: null, serviceTypeId: 2, shortName: 'GHN' }]);

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1',
        cartItemId: 'cart-item-1',
        shippingDistrictId: 1450,
        shippingWardCode: '21211',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1',
    title: 'Offer 1',
    price: new Prisma.Decimal(200000),
    shopId: 'shop-1',
    availableQuantity: 10,
    verificationLevel: 'standard',
    productModelId: 'model-1',
    productModel: { brandId: 'brand-1' },
    parcelWeightGrams: 500,
    parcelLengthCm: 20,
    parcelWidthCm: 12,
    parcelHeightCm: 8,
    ...overrides,
  };
}
