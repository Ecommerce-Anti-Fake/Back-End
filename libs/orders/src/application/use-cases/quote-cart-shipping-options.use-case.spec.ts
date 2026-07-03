import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';
import { QuoteCartShippingOptionsUseCase } from './quote-cart-shipping-options.use-case';

describe('QuoteCartShippingOptionsUseCase', () => {
  const ordersRepositoryMock = {
    getOrCreateActiveCart: jest.fn(),
    findDefaultAddressByUserId: jest.fn(),
    findActiveShippingCarriers: jest.fn(),
  };
  const shippingCarrierAdapterMock = {
    listGhnServices: jest.fn(),
    quoteShipment: jest.fn(),
  };
  let useCase: QuoteCartShippingOptionsUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    ordersRepositoryMock.findActiveShippingCarriers.mockResolvedValue([
      { code: 'GHN', name: 'Giao Hang Nhanh', description: null },
    ]);
    useCase = new QuoteCartShippingOptionsUseCase(
      ordersRepositoryMock as unknown as OrdersRepository,
      shippingCarrierAdapterMock as unknown as ShippingCarrierAdapterService,
    );
  });

  it('quotes one GHN shipment per shop when cart has multiple items from the same shop', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [
        createCartItem({ id: 'item-1', offerId: 'offer-1', title: 'Offer 1', quantity: 2 }),
        createCartItem({
          id: 'item-2',
          offerId: 'offer-2',
          title: 'Offer 2',
          quantity: 1,
          price: 300000,
          parcelWeightGrams: 300,
          parcelHeightCm: 2,
        }),
      ],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Nhanh' },
    ]);
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 39000,
      serviceId: 53320,
      serviceTypeId: 2,
    });

    const result = await useCase.execute({
      buyerUserId: 'buyer-1',
      cartItemIds: ['item-1', 'item-2'],
    });

    expect(shippingCarrierAdapterMock.listGhnServices).toHaveBeenCalledTimes(1);
    expect(shippingCarrierAdapterMock.listGhnServices).toHaveBeenCalledWith(1450, 1442);
    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledTimes(1);
    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        providerCode: 'GHN',
        declaredValue: 500000,
        parcelWeightGrams: 1300,
        parcelLengthCm: 30,
        parcelWidthCm: 15,
        parcelHeightCm: 18,
      }),
    );
    expect(result).toEqual({
      options: [
        {
          optionCode: 'GHN_1',
          providerCode: 'GHN',
          providerName: 'Giao Hang Nhanh',
          methodName: 'Nhanh',
          shippingFee: 39000,
          estimatedDelivery: '2-3 ngay',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('shippingServiceId');
    expect(JSON.stringify(result)).not.toContain('shippingServiceTypeId');
  });

  it('quotes shops separately when cart contains items from different shops', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [
        createCartItem({ id: 'item-1', shopId: 'shop-1', shopName: 'Shop 1' }),
        createCartItem({ id: 'item-2', shopId: 'shop-2', shopName: 'Shop 2' }),
      ],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices
      .mockResolvedValueOnce([{ serviceId: 53320, serviceTypeId: 2, shortName: 'Nhanh' }])
      .mockResolvedValueOnce([{ serviceId: 53320, serviceTypeId: 2, shortName: 'Nhanh' }]);
    shippingCarrierAdapterMock.quoteShipment
      .mockResolvedValueOnce({ shippingFeeAmount: 30000, serviceId: 53320, serviceTypeId: 2 })
      .mockResolvedValueOnce({ shippingFeeAmount: 25000, serviceId: 53320, serviceTypeId: 2 });

    const result = await useCase.execute({
      buyerUserId: 'buyer-1',
      cartItemIds: ['item-1', 'item-2'],
    });

    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      options: [
        {
          optionCode: 'GHN_1',
          providerCode: 'GHN',
          providerName: 'Giao Hang Nhanh',
          methodName: 'Nhanh',
          shippingFee: 55000,
          estimatedDelivery: '2-3 ngay',
        },
      ],
    });
  });

  it('uses the buyer default address when quote input omits destination fields', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem({ id: 'item-1' })],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Nhanh' },
    ]);
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 30000,
      serviceId: 53320,
      serviceTypeId: 2,
    });

    await useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] });

    expect(ordersRepositoryMock.findDefaultAddressByUserId).toHaveBeenCalledWith('buyer-1');
    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingAddress: '12 Nguyen Trai',
        shippingDistrictId: 1450,
        shippingWardCode: '21211',
      }),
    );
  });

  it('requires parcel snapshots before quoting GHN options', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem({ parcelWeightGrams: null })],
    });
    mockDefaultAddress(ordersRepositoryMock);

    await expect(
      useCase.execute({
        buyerUserId: 'buyer-1',
        cartItemIds: ['item-1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('quotes only selected cart items', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [
        createCartItem({ id: 'item-1', offerId: 'offer-1', quantity: 1 }),
        createCartItem({ id: 'item-2', offerId: 'offer-2', quantity: 3 }),
      ],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Nhanh' },
    ]);
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 30000,
      serviceId: 53320,
      serviceTypeId: 2,
    });

    await useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] });

    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledTimes(1);
    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        declaredValue: 100000,
        parcelWeightGrams: 500,
      }),
    );
  });
});

function mockDefaultAddress(ordersRepositoryMock: { findDefaultAddressByUserId: jest.Mock }) {
  ordersRepositoryMock.findDefaultAddressByUserId.mockResolvedValueOnce({
    addressLine: '12 Nguyen Trai',
    provinceCode: 'VN-P202',
    wardCode: 'VN-P202-D1450-W21211',
  });
}

function createCartItem(overrides: Record<string, unknown> = {}) {
  const shopId = String(overrides.shopId ?? 'shop-1');
  const shopName = String(overrides.shopName ?? 'Shop 1');

  return {
    id: overrides.id ?? 'item-1',
    offerId: overrides.offerId ?? 'offer-1',
    quantity: overrides.quantity ?? 1,
    offer: {
      id: overrides.offerId ?? 'offer-1',
      title: overrides.title ?? 'Offer 1',
      price: new Prisma.Decimal(overrides.price ?? 100000),
      shopId,
      parcelWeightGrams: Object.prototype.hasOwnProperty.call(overrides, 'parcelWeightGrams')
        ? overrides.parcelWeightGrams
        : 500,
      parcelLengthCm: Object.prototype.hasOwnProperty.call(overrides, 'parcelLengthCm') ? overrides.parcelLengthCm : 30,
      parcelWidthCm: Object.prototype.hasOwnProperty.call(overrides, 'parcelWidthCm') ? overrides.parcelWidthCm : 15,
      parcelHeightCm: Object.prototype.hasOwnProperty.call(overrides, 'parcelHeightCm') ? overrides.parcelHeightCm : 8,
      shop: {
        id: shopId,
        shopName,
        warehouseAddress: overrides.warehouseAddress ?? 'Warehouse address',
        warehouseWardCode: overrides.warehouseWardCode ?? 'VN-P202-D1442-W20101',
        warehouseWardName: overrides.warehouseWardName ?? 'Phuong kho',
      },
      shippingMethods: [
        {
          providerCode: 'GHN',
          providerName: 'Giao Hang Nhanh',
          shippingFee: new Prisma.Decimal(25000),
          estimatedDays: '2-3 ngay',
          isEnabled: true,
        },
      ],
    },
  };
}
