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
        fromDistrictId: 1442,
        fromWardCode: '20101',
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
          estimatedDelivery: '2-3 ngày',
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
          estimatedDelivery: '2-3 ngày',
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

  it('uses the seller warehouse district for GHN service lookup instead of GHN_FROM_DISTRICT_ID', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem({ id: 'item-1', warehouseWardCode: 'VN-P202-D9999-W20101' })],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: null, serviceTypeId: 2, shortName: 'GHN' },
    ]);
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 30000,
      serviceId: null,
      serviceTypeId: 2,
    });

    await useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] });

    expect(shippingCarrierAdapterMock.listGhnServices).toHaveBeenCalledWith(1450, 9999);
    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledWith(
      expect.objectContaining({
        fromDistrictId: 9999,
        fromWardCode: '20101',
      }),
    );
  });

  it('rejects quotes when buyer has no default address', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem({ id: 'item-1' })],
    });
    ordersRepositoryMock.findDefaultAddressByUserId.mockResolvedValueOnce(null);

    await expect(useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] })).rejects.toThrow(
      'Buyer default shipping address is required for shipping quote',
    );
  });

  it('rejects quotes when shop warehouse ward code is missing', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem({ id: 'item-1', warehouseWardCode: null })],
    });
    mockDefaultAddress(ordersRepositoryMock);

    await expect(useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] })).rejects.toThrow(
      'Shop warehouse address is required for shipping quote',
    );
  });

  it('returns every positive GHN Nhanh, Chuan, and Tiet kiem option', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem({ id: 'item-1' })],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Nhanh' },
      { serviceId: 53321, serviceTypeId: 3, shortName: 'Chuan' },
      { serviceId: 53322, serviceTypeId: 4, shortName: 'Tiet kiem' },
    ]);
    shippingCarrierAdapterMock.quoteShipment
      .mockResolvedValueOnce({ shippingFeeAmount: 31000, serviceId: 53320, serviceTypeId: 2 })
      .mockResolvedValueOnce({ shippingFeeAmount: 24000, serviceId: 53321, serviceTypeId: 3 })
      .mockResolvedValueOnce({ shippingFeeAmount: 19000, serviceId: 53322, serviceTypeId: 4 });

    const result = await useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] });

    expect(result.options).toEqual([
      expect.objectContaining({ methodName: 'Nhanh', shippingFee: 31000, estimatedDelivery: '2-3 ngày' }),
      expect.objectContaining({ methodName: 'Chuẩn', shippingFee: 24000, estimatedDelivery: '3-4 ngày' }),
      expect.objectContaining({ methodName: 'Tiết kiệm', shippingFee: 19000, estimatedDelivery: '3-4 ngày' }),
    ]);
  });

  it('does not return GHN Hang nang for a 1000g shoe shipment', async () => {
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [
        createCartItem({
          id: 'item-1',
          title: 'Giay the thao nam basic',
          price: 2990000,
          parcelWeightGrams: 1000,
          parcelLengthCm: 35,
          parcelWidthCm: 25,
          parcelHeightCm: 15,
        }),
      ],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Hang nhe' },
      { serviceId: 53321, serviceTypeId: 5, shortName: 'Hang nang' },
    ]);
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 31000,
      serviceId: 53320,
      serviceTypeId: 2,
    });

    const result = await useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] });

    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledTimes(1);
    expect(shippingCarrierAdapterMock.quoteShipment).toHaveBeenCalledWith(
      expect.objectContaining({ shippingServiceId: 53320 }),
    );
    expect(result.options).toEqual([
      expect.objectContaining({ methodName: 'Chuẩn', shippingFee: 31000 }),
    ]);
    expect(result.options).not.toEqual([expect.objectContaining({ methodName: expect.stringContaining('nang') })]);
  });

  it('does not return unintegrated active carriers with zero shipping fee', async () => {
    ordersRepositoryMock.findActiveShippingCarriers.mockResolvedValueOnce([
      { code: 'GHN', name: 'Giao Hang Nhanh', description: null },
      { code: 'GHTK', name: 'Giao Hang Tiet Kiem', description: null },
      { code: 'VIETTEL_POST', name: 'Viettel Post', description: null },
      { code: 'JNT', name: 'J&T Express', description: null },
    ]);
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

    const result = await useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] });

    expect(result.options).toEqual([
      expect.objectContaining({ providerCode: 'GHN', shippingFee: 30000 }),
    ]);
    expect(result.options.map((option) => option.providerCode)).not.toEqual(
      expect.arrayContaining(['GHTK', 'VIETTEL_POST', 'JNT']),
    );
  });

  it('returns active self delivery as zero fee when configured', async () => {
    ordersRepositoryMock.findActiveShippingCarriers.mockResolvedValueOnce([
      { code: 'SELF_DELIVERY', name: 'Tu van chuyen', description: null },
      { code: 'GHN', name: 'Giao Hang Nhanh', description: null },
    ]);
    ordersRepositoryMock.getOrCreateActiveCart.mockResolvedValueOnce({
      id: 'cart-1',
      buyerUserId: 'buyer-1',
      cartStatus: 'ACTIVE',
      items: [createCartItem({ id: 'item-1' })],
    });
    mockDefaultAddress(ordersRepositoryMock);
    shippingCarrierAdapterMock.listGhnServices.mockResolvedValueOnce([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Hang nhe' },
    ]);
    shippingCarrierAdapterMock.quoteShipment.mockResolvedValueOnce({
      shippingFeeAmount: 30000,
      serviceId: 53320,
      serviceTypeId: 2,
    });

    const result = await useCase.execute({ buyerUserId: 'buyer-1', cartItemIds: ['item-1'] });

    expect(result.options).toEqual([
      expect.objectContaining({ providerCode: 'SELF_DELIVERY', shippingFee: 0 }),
      expect.objectContaining({ providerCode: 'GHN', methodName: 'Chuẩn', shippingFee: 30000 }),
    ]);
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
        warehouseWardCode: Object.prototype.hasOwnProperty.call(overrides, 'warehouseWardCode')
          ? overrides.warehouseWardCode
          : 'VN-P202-D1442-W20101',
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
