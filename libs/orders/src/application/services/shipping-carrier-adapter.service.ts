import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ShippingBookingInput = {
  orderId: string;
  providerCode: string;
  providerName: string;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingDistrictId?: number | null;
  shippingWardCode?: string | null;
  shippingServiceId?: number | null;
  shippingServiceTypeId?: number | null;
  parcelWeightGrams?: number | null;
  parcelLengthCm?: number | null;
  parcelWidthCm?: number | null;
  parcelHeightCm?: number | null;
};

export type ShippingBookingResult = {
  trackingCode: string;
  providerStatus: 'BOOKED';
};

export type ShippingQuoteInput = Omit<ShippingBookingInput, 'orderId' | 'providerName'> & {
  itemName: string;
  declaredValue: number;
  fallbackFee: number;
};

export type ShippingQuoteResult = {
  shippingFeeAmount: number;
  serviceId: number | null;
  serviceTypeId: number | null;
};

export type ShippingTrackingResult = {
  providerStatus: string;
  fulfillmentStatus: 'SHIPPING' | 'DELIVERED';
};

export type GhnProvince = {
  provinceId: number;
  provinceName: string;
};

export type GhnDistrict = {
  districtId: number;
  districtName: string;
};

export type GhnWard = {
  wardCode: string;
  wardName: string;
};

export type GhnService = {
  serviceId: number | null;
  serviceTypeId: number;
  shortName: string;
};

@Injectable()
export class ShippingCarrierAdapterService {
  constructor(private readonly configService: ConfigService) {}

  async bookShipment(input: ShippingBookingInput): Promise<ShippingBookingResult> {
    const providerCode = input.providerCode || 'SELF_DELIVERY';
    if (providerCode === 'GHN') {
      return this.bookGhnShipment(input);
    }

    return this.createLocalBooking(input);
  }

  async quoteShipment(input: ShippingQuoteInput): Promise<ShippingQuoteResult> {
    if ((input.providerCode || 'SELF_DELIVERY') !== 'GHN') {
      return {
        shippingFeeAmount: input.fallbackFee,
        serviceId: input.shippingServiceId ?? null,
        serviceTypeId: input.shippingServiceTypeId ?? null,
      };
    }

    const credentials = this.getGhnCredentials();
    const body = this.createGhnParcelPayload(input);
    const response = await fetch(this.resolveGhnFeeUrl(credentials.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: credentials.token,
        ShopId: credentials.shopId,
      },
      body: JSON.stringify({
        ...body,
        insurance_value: Math.max(0, Math.round(input.declaredValue || 0)),
        coupon: null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      data?: {
        total?: number;
        service_fee?: number;
      };
    } | null;
    const fee = Number(payload?.data?.total ?? payload?.data?.service_fee ?? 0);
    if (!response.ok || fee <= 0) {
      throw new ServiceUnavailableException(payload?.message || 'Could not calculate GHN shipping fee');
    }

    return {
      shippingFeeAmount: fee,
      serviceId: input.shippingServiceId ?? null,
      serviceTypeId: this.resolveServiceTypeId(input),
    };
  }

  async trackShipment(input: { providerCode?: string | null; trackingCode: string }): Promise<ShippingTrackingResult> {
    const providerCode = input.providerCode || 'SELF_DELIVERY';
    if (providerCode === 'GHN') {
      return this.trackGhnShipment(input.trackingCode);
    }

    throw new ServiceUnavailableException('Carrier tracking sync currently supports GHN only');
  }

  async listGhnProvinces(): Promise<GhnProvince[]> {
    const credentials = this.getGhnCredentials();
    const payload = await this.fetchGhn<{ data?: Array<{ ProvinceID?: number; ProvinceName?: string }> }>(
      this.resolveGhnMasterDataUrl(credentials.baseUrl, 'province'),
      credentials,
    );

    return (payload.data ?? [])
      .map((item) => ({
        provinceId: Number(item.ProvinceID),
        provinceName: String(item.ProvinceName || ''),
      }))
      .filter((item) => item.provinceId > 0 && item.provinceName);
  }

  async listGhnDistricts(provinceId: number): Promise<GhnDistrict[]> {
    const credentials = this.getGhnCredentials();
    const payload = await this.fetchGhn<{ data?: Array<{ DistrictID?: number; DistrictName?: string }> }>(
      `${this.resolveGhnMasterDataUrl(credentials.baseUrl, 'district')}?province_id=${encodeURIComponent(String(provinceId))}`,
      credentials,
    );

    return (payload.data ?? [])
      .map((item) => ({
        districtId: Number(item.DistrictID),
        districtName: String(item.DistrictName || ''),
      }))
      .filter((item) => item.districtId > 0 && item.districtName);
  }

  async listGhnWards(districtId: number): Promise<GhnWard[]> {
    const credentials = this.getGhnCredentials();
    const payload = await this.fetchGhn<{ data?: Array<{ WardCode?: string; WardName?: string }> }>(
      `${this.resolveGhnMasterDataUrl(credentials.baseUrl, 'ward')}?district_id=${encodeURIComponent(String(districtId))}`,
      credentials,
    );

    return (payload.data ?? [])
      .map((item) => ({
        wardCode: String(item.WardCode || ''),
        wardName: String(item.WardName || ''),
      }))
      .filter((item) => item.wardCode && item.wardName);
  }

  async listGhnServices(districtId: number, fromDistrictIdOverride?: number | null): Promise<GhnService[]> {
    const credentials = this.getGhnCredentials();
    const fromDistrictId =
      fromDistrictIdOverride ?? Number(this.configService.get<string>('GHN_FROM_DISTRICT_ID')?.trim() || 0);
    if (!fromDistrictId) {
      return [
        {
          serviceId: null,
          serviceTypeId: this.resolveServiceTypeId({}),
          shortName: 'GHN',
        },
      ];
    }

    const response = await fetch(this.resolveGhnAvailableServicesUrl(credentials.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: credentials.token,
      },
      body: JSON.stringify({
        shop_id: Number(credentials.shopId),
        from_district: fromDistrictId,
        to_district: districtId,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      data?: Array<{ service_id?: number; service_type_id?: number; short_name?: string }>;
    } | null;

    if (!response.ok) {
      throw new ServiceUnavailableException(payload?.message || 'Could not load GHN services');
    }

    return (payload?.data ?? [])
      .map((item) => ({
        serviceId: Number(item.service_id) || null,
        serviceTypeId: Number(item.service_type_id) || this.resolveServiceTypeId({}),
        shortName: String(item.short_name || 'GHN'),
      }))
      .filter((item) => item.serviceTypeId > 0);
  }

  private async bookGhnShipment(input: ShippingBookingInput): Promise<ShippingBookingResult> {
    const credentials = this.getGhnCredentials();
    const body = this.createGhnOrderPayload(input);

    const response = await fetch(this.resolveGhnCreateOrderUrl(credentials.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: credentials.token,
        ShopId: credentials.shopId,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as {
      code?: number;
      message?: string;
      data?: {
        order_code?: string;
        sort_code?: string;
      };
    } | null;

    const trackingCode = payload?.data?.order_code || payload?.data?.sort_code || null;
    if (!response.ok || !trackingCode) {
      throw new ServiceUnavailableException(payload?.message || 'Could not create GHN shipment');
    }

    return {
      trackingCode,
      providerStatus: 'BOOKED',
    };
  }

  private async trackGhnShipment(trackingCode: string): Promise<ShippingTrackingResult> {
    const credentials = this.getGhnCredentials();
    const response = await fetch(this.resolveGhnTrackingUrl(credentials.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: credentials.token,
        ShopId: credentials.shopId,
      },
      body: JSON.stringify({ order_code: trackingCode }),
    });

    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      data?: {
        status?: string;
        order_code?: string;
      };
    } | null;
    const providerStatus = String(payload?.data?.status || '').trim();
    if (!response.ok || !providerStatus) {
      throw new ServiceUnavailableException(payload?.message || 'Could not load GHN tracking status');
    }

    return {
      providerStatus,
      fulfillmentStatus: this.mapGhnFulfillmentStatus(providerStatus),
    };
  }

  private createLocalBooking(input: ShippingBookingInput): ShippingBookingResult {
    const providerCode = input.providerCode || 'SELF_DELIVERY';
    const suffix = input.orderId.replace(/-/g, '').slice(0, 10).toUpperCase();

    return {
      trackingCode: `${providerCode}-${suffix}`,
      providerStatus: 'BOOKED',
    };
  }

  private getGhnCredentials() {
    const baseUrl = this.configService.get<string>('GHN_BASE_URL')?.trim() || 'https://online-gateway.ghn.vn';
    const token = this.configService.get<string>('GHN_TOKEN')?.trim();
    const shopId = this.configService.get<string>('GHN_SHOP_ID')?.trim();

    if (!token || !shopId) {
      throw new ServiceUnavailableException('GHN credentials are not configured');
    }

    return { baseUrl, token, shopId };
  }

  private resolveGhnCreateOrderUrl(baseUrl: string) {
    const normalized = baseUrl.replace(/\/$/, '');
    if (normalized.endsWith('/shiip/public-api/v2/shipping-order/create')) {
      return normalized;
    }

    return `${this.resolveGhnGatewayRoot(normalized)}/shiip/public-api/v2/shipping-order/create`;
  }

  private resolveGhnFeeUrl(baseUrl: string) {
    const normalized = baseUrl.replace(/\/$/, '');
    if (normalized.endsWith('/shiip/public-api/v2/shipping-order/fee')) {
      return normalized;
    }

    return `${this.resolveGhnGatewayRoot(normalized)}/shiip/public-api/v2/shipping-order/fee`;
  }

  private resolveGhnTrackingUrl(baseUrl: string) {
    const normalized = baseUrl.replace(/\/$/, '');
    if (normalized.endsWith('/shiip/public-api/v2/shipping-order/detail')) {
      return normalized;
    }

    return `${this.resolveGhnGatewayRoot(normalized)}/shiip/public-api/v2/shipping-order/detail`;
  }

  private resolveGhnAvailableServicesUrl(baseUrl: string) {
    const normalized = baseUrl.replace(/\/$/, '');
    if (normalized.endsWith('/shiip/public-api/v2/shipping-order/available-services')) {
      return normalized;
    }

    return `${this.resolveGhnGatewayRoot(normalized)}/shiip/public-api/v2/shipping-order/available-services`;
  }

  private resolveGhnMasterDataUrl(baseUrl: string, resource: 'province' | 'district' | 'ward') {
    const normalized = baseUrl.replace(/\/$/, '');
    if (normalized.endsWith(`/shiip/public-api/master-data/${resource}`)) {
      return normalized;
    }

    return `${this.resolveGhnGatewayRoot(normalized)}/shiip/public-api/master-data/${resource}`;
  }

  private resolveGhnGatewayRoot(normalizedBaseUrl: string) {
    const publicApiIndex = normalizedBaseUrl.indexOf('/shiip/public-api');
    if (publicApiIndex >= 0) {
      return normalizedBaseUrl.slice(0, publicApiIndex);
    }

    return normalizedBaseUrl;
  }

  private async fetchGhn<T>(url: string, credentials: { token: string; shopId: string }): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Token: credentials.token,
        ShopId: credentials.shopId,
      },
    });
    const payload = (await response.json().catch(() => null)) as (T & { message?: string }) | null;

    if (!response.ok || !payload) {
      throw new ServiceUnavailableException(payload?.message || 'Could not load GHN data');
    }

    return payload;
  }

  private createGhnOrderPayload(input: ShippingBookingInput) {
    const paymentTypeId = Number(this.configService.get<string>('GHN_PAYMENT_TYPE_ID')?.trim() || 2);
    const parcel = this.createGhnParcelPayload({ ...input, itemName: `Order ${input.orderId.slice(0, 8)}` });

    return {
      ...parcel,
      payment_type_id: paymentTypeId,
      required_note: this.configService.get<string>('GHN_REQUIRED_NOTE')?.trim() || 'KHONGCHOXEMHANG',
      note: `Order ${input.orderId}`,
      to_name: input.shippingName?.trim() || 'Buyer',
      to_phone: input.shippingPhone?.trim() || '',
      to_address: input.shippingAddress?.trim() || '',
    };
  }

  private createGhnParcelPayload(input: {
    shippingDistrictId?: number | null;
    shippingWardCode?: string | null;
    shippingServiceId?: number | null;
    shippingServiceTypeId?: number | null;
    parcelWeightGrams?: number | null;
    parcelLengthCm?: number | null;
    parcelWidthCm?: number | null;
    parcelHeightCm?: number | null;
    itemName: string;
  }) {
    const toDistrictId = input.shippingDistrictId;
    const toWardCode = input.shippingWardCode?.trim();
    const serviceTypeId = this.resolveServiceTypeId(input);
    const weight = input.parcelWeightGrams;
    const length = input.parcelLengthCm;
    const width = input.parcelWidthCm;
    const height = input.parcelHeightCm;

    if (!toDistrictId || !toWardCode) {
      throw new ServiceUnavailableException('GHN district and ward are required');
    }

    if (!weight || !length || !width || !height) {
      throw new ServiceUnavailableException('Parcel weight and dimensions are required for GHN');
    }

    return {
      to_district_id: toDistrictId,
      to_ward_code: toWardCode,
      service_id: input.shippingServiceId ?? undefined,
      service_type_id: input.shippingServiceId ? undefined : serviceTypeId,
      weight,
      length,
      width,
      height,
      items: [
        {
          name: input.itemName,
          quantity: 1,
          weight,
        },
      ],
    };
  }

  private resolveServiceTypeId(input: { shippingServiceTypeId?: number | null }) {
    return input.shippingServiceTypeId ?? Number(this.configService.get<string>('GHN_SERVICE_TYPE_ID')?.trim() || 2);
  }

  private mapGhnFulfillmentStatus(providerStatus: string): 'SHIPPING' | 'DELIVERED' {
    return providerStatus.trim().toLowerCase() === 'delivered' ? 'DELIVERED' : 'SHIPPING';
  }
}
