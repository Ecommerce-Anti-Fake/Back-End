import { ConfigService } from '@nestjs/config';
import { ShippingCarrierAdapterService } from './shipping-carrier-adapter.service';

describe('ShippingCarrierAdapterService', () => {
  const configServiceMock = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('creates a local tracking code for non-GHN providers', async () => {
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    const result = await service.bookShipment({
      orderId: 'order-1234567890',
      providerCode: 'SELF_DELIVERY',
      providerName: 'Tu van chuyen',
      shippingName: 'Buyer',
      shippingPhone: '0987654321',
      shippingAddress: '12 Nguyen Trai',
    });

    expect(result).toEqual({
      trackingCode: 'SELF_DELIVERY-ORDER12345',
      providerStatus: 'BOOKED',
    });
  });

  it('calls GHN create order API when provider is GHN', async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GHN_BASE_URL: 'https://dev-online-gateway.ghn.vn',
        GHN_TOKEN: 'token-1',
        GHN_SHOP_ID: '12345',
      };
      return values[key];
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          order_code: 'GHN123456',
        },
      }),
    } as Response);
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    const result = await service.bookShipment({
      orderId: 'order-1',
      providerCode: 'GHN',
      providerName: 'Giao Hang Nhanh',
      shippingName: 'Buyer',
      shippingPhone: '0987654321',
      shippingAddress: '12 Nguyen Trai, TP.HCM',
      shippingDistrictId: 1450,
      shippingWardCode: '21211',
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: 'token-1',
          ShopId: '12345',
        },
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      payment_type_id: 2,
      required_note: 'KHONGCHOXEMHANG',
      to_name: 'Buyer',
      to_phone: '0987654321',
      to_address: '12 Nguyen Trai, TP.HCM',
      to_district_id: 1450,
      to_ward_code: '21211',
      service_type_id: 2,
      weight: 500,
      length: 20,
      width: 12,
      height: 8,
    });
    expect(result).toEqual({
      trackingCode: 'GHN123456',
      providerStatus: 'BOOKED',
    });
  });

  it('rejects GHN booking when credentials are missing', async () => {
    configServiceMock.get.mockReturnValue(undefined);
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    await expect(
      service.bookShipment({
        orderId: 'order-1',
        providerCode: 'GHN',
        providerName: 'Giao Hang Nhanh',
        shippingName: 'Buyer',
        shippingPhone: '0987654321',
        shippingAddress: '12 Nguyen Trai',
      }),
    ).rejects.toThrow('GHN credentials are not configured');
  });

  it('calculates a GHN fee from destination and parcel snapshot', async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GHN_BASE_URL: 'https://dev-online-gateway.ghn.vn',
        GHN_TOKEN: 'token-1',
        GHN_SHOP_ID: '12345',
      };
      return values[key];
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: 200,
        data: {
          total: 31000,
        },
      }),
    } as Response);
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    const result = await service.quoteShipment({
      providerCode: 'GHN',
      shippingName: 'Buyer',
      shippingPhone: '0987654321',
      shippingAddress: '12 Nguyen Trai',
      shippingDistrictId: 1450,
      shippingWardCode: '21211',
      fromDistrictId: 1442,
      fromWardCode: '20101',
      shippingServiceTypeId: 2,
      parcelWeightGrams: 500,
      parcelLengthCm: 20,
      parcelWidthCm: 12,
      parcelHeightCm: 8,
      itemName: 'Offer 1',
      declaredValue: 200000,
      fallbackFee: 0,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      to_district_id: 1450,
      to_ward_code: '21211',
      from_district_id: 1442,
      service_type_id: 2,
      weight: 500,
      insurance_value: 200000,
    });
    expect(result).toEqual({
      shippingFeeAmount: 31000,
      serviceId: null,
      serviceTypeId: 2,
    });
  });

  it('loads GHN districts and wards for checkout selectors', async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GHN_BASE_URL: 'https://dev-online-gateway.ghn.vn',
        GHN_TOKEN: 'token-1',
        GHN_SHOP_ID: '12345',
      };
      return values[key];
    });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ DistrictID: 1450, DistrictName: 'Quan 1' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ WardCode: '21211', WardName: 'Phuong Ben Nghe' }],
        }),
      } as Response);
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    await expect(service.listGhnDistricts(202)).resolves.toEqual([{ districtId: 1450, districtName: 'Quan 1' }]);
    await expect(service.listGhnWards(1450)).resolves.toEqual([{ wardCode: '21211', wardName: 'Phuong Ben Nghe' }]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district?province_id=202',
      expect.objectContaining({
        headers: {
          Token: 'token-1',
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=1450',
      expect.objectContaining({
        headers: {
          Token: 'token-1',
        },
      }),
    );
  });

  it('normalizes GHN base URL when it already includes public-api path', async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GHN_BASE_URL: 'https://online-gateway.ghn.vn/shiip/public-api',
        GHN_TOKEN: 'token-1',
        GHN_SHOP_ID: '12345',
      };
      return values[key];
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ ProvinceID: 202, ProvinceName: 'Ho Chi Minh' }],
      }),
    } as Response);
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    await expect(service.listGhnProvinces()).resolves.toEqual([{ provinceId: 202, provinceName: 'Ho Chi Minh' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://online-gateway.ghn.vn/shiip/public-api/master-data/province',
      expect.objectContaining({
        headers: {
          Token: 'token-1',
        },
      }),
    );
  });

  it('loads GHN available services with the origin district override before env fallback', async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GHN_BASE_URL: 'https://dev-online-gateway.ghn.vn',
        GHN_TOKEN: 'token-1',
        GHN_SHOP_ID: '12345',
        GHN_FROM_DISTRICT_ID: '1442',
      };
      return values[key];
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ service_id: 53320, service_type_id: 2, short_name: 'Hang nhe' }],
      }),
    } as Response);
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    await expect(service.listGhnServices(1450, 9999)).resolves.toEqual([
      { serviceId: 53320, serviceTypeId: 2, shortName: 'Hang nhe' },
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      shop_id: 12345,
      from_district: 9999,
      to_district: 1450,
    });
  });

  it('tracks GHN delivery status from order detail API', async () => {
    configServiceMock.get.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        GHN_BASE_URL: 'https://dev-online-gateway.ghn.vn',
        GHN_TOKEN: 'token-1',
        GHN_SHOP_ID: '12345',
      };
      return values[key];
    });
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          order_code: 'GHN123456',
          status: 'delivered',
        },
      }),
    } as Response);
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    const result = await service.trackShipment({
      providerCode: 'GHN',
      trackingCode: 'GHN123456',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: 'token-1',
          ShopId: '12345',
        },
        body: JSON.stringify({ order_code: 'GHN123456' }),
      }),
    );
    expect(result).toEqual({
      providerStatus: 'delivered',
      fulfillmentStatus: 'DELIVERED',
    });
  });

  it('rejects tracking sync for non-GHN providers', async () => {
    const service = new ShippingCarrierAdapterService(configServiceMock as unknown as ConfigService);

    await expect(
      service.trackShipment({
        providerCode: 'SELF_DELIVERY',
        trackingCode: 'SELF_DELIVERY-ORDER12345',
      }),
    ).rejects.toThrow('Carrier tracking sync currently supports GHN only');
  });
});
