import { BadRequestException, Injectable } from '@nestjs/common';
import { CartWithItems, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';

@Injectable()
export class QuoteCartShippingOptionsUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService,
  ) {}

  async execute(input: {
    buyerUserId: string;
    shippingAddress?: string | null;
    shippingDistrictId?: number | null;
    shippingWardCode?: string | null;
  }): Promise<CartShippingOptionsResponse> {
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.buyerUserId);
    const destination = await this.resolveShippingDestination(input);
    const shopGroups = this.groupItemsByShop(cart);
    const shops: CartShopShippingOptions[] = [];

    for (const group of shopGroups) {
      const options = await this.quoteShopOptions(destination, group);
      shops.push({
        shopId: group.shopId,
        shopName: group.shopName,
        options,
      });
    }

    return {
      shops,
      totalShippingFee: shops.reduce((total, shop) => total + this.resolveDefaultShippingFee(shop.options), 0),
    };
  }

  private groupItemsByShop(cart: CartWithItems): ShopCartItemGroup[] {
    const groups = new Map<string, ShopCartItemGroup>();

    for (const item of cart.items) {
      const shopId = item.offer.shop.id;
      const existing = groups.get(shopId);
      if (existing) {
        existing.items.push(item);
        continue;
      }

      groups.set(shopId, {
        shopId,
        shopName: item.offer.shop.shopName,
        warehouseAddress: item.offer.shop.warehouseAddress,
        warehouseWardCode: item.offer.shop.warehouseWardCode,
        warehouseWardName: item.offer.shop.warehouseWardName,
        items: [item],
      });
    }

    return Array.from(groups.values());
  }

  private async quoteShopOptions(
    destination: ShippingQuoteDestination,
    group: ShopCartItemGroup,
  ): Promise<CartShippingOption[]> {
    const providerMethods = this.resolveCommonProviderMethods(group);
    const options: CartShippingOption[] = [];

    for (const method of providerMethods) {
      if (method.providerCode === 'GHN') {
        options.push(...(await this.quoteGhnShopOptions(destination, group)));
        continue;
      }

      options.push({
        optionCode: method.providerCode,
        providerCode: method.providerCode,
        providerName: method.providerName,
        methodName: method.providerName,
        shippingFee: this.sumStaticProviderFees(group, method.providerCode),
        estimatedDelivery: method.estimatedDays || null,
      });
    }

    return options;
  }

  private resolveCommonProviderMethods(group: ShopCartItemGroup) {
    if (group.items.length === 0) {
      return [];
    }

    const providerCounts = new Map<string, number>();
    const providerMethods = new Map<
      string,
      {
        providerCode: string;
        providerName: string;
        estimatedDays: string | null;
      }
    >();

    for (const item of group.items) {
      const itemProviders = new Set<string>();
      for (const method of item.offer.shippingMethods ?? []) {
        itemProviders.add(method.providerCode);
        if (!providerMethods.has(method.providerCode)) {
          providerMethods.set(method.providerCode, {
            providerCode: method.providerCode,
            providerName: method.providerName,
            estimatedDays: method.estimatedDays ?? null,
          });
        }
      }

      for (const providerCode of itemProviders) {
        providerCounts.set(providerCode, (providerCounts.get(providerCode) ?? 0) + 1);
      }
    }

    return Array.from(providerMethods.values()).filter(
      (method) => providerCounts.get(method.providerCode) === group.items.length,
    );
  }

  private async quoteGhnShopOptions(
    destination: ShippingQuoteDestination,
    group: ShopCartItemGroup,
  ) {
    if (!destination.shippingDistrictId || !destination.shippingWardCode?.trim()) {
      throw new BadRequestException('Default shipping address district and ward are required for GHN quotes');
    }

    const parcel = this.resolveShopParcel(group);
    const declaredValue = group.items.reduce(
      (total, item) => total + Number(item.offer.price.toString()) * item.quantity,
      0,
    );
    const services = await this.shippingCarrierAdapterService.listGhnServices(
      destination.shippingDistrictId,
      parseInternalAddressWardCode(group.warehouseWardCode)?.districtId ?? null,
    );
    const quoted = await Promise.all(
      services.map(async (service, index) => {
        const quote = await this.shippingCarrierAdapterService.quoteShipment({
          providerCode: 'GHN',
          shippingName: null,
          shippingPhone: null,
          shippingAddress: destination.shippingAddress ?? null,
          shippingDistrictId: destination.shippingDistrictId ?? null,
          shippingWardCode: destination.shippingWardCode ?? null,
          shippingServiceId: service.serviceId,
          shippingServiceTypeId: service.serviceTypeId,
          ...parcel,
          itemName: group.items.length === 1 ? group.items[0].offer.title : `${group.shopName} cart shipment`,
          declaredValue,
          fallbackFee: 0,
        });

        return {
          optionCode: `GHN_${index + 1}`,
          providerCode: 'GHN',
          providerName: 'Giao Hang Nhanh',
          methodName: service.shortName || 'GHN',
          shippingFee: quote.shippingFeeAmount,
          estimatedDelivery: this.estimateGhnDelivery(service.shortName),
        };
      }),
    );

    return quoted.filter((option) => option.shippingFee > 0);
  }

  private resolveShopParcel(group: ShopCartItemGroup) {
    let parcelWeightGrams = 0;
    let parcelLengthCm = 0;
    let parcelWidthCm = 0;
    let parcelHeightCm = 0;

    for (const item of group.items) {
      const weight = item.offer.parcelWeightGrams ?? null;
      const length = item.offer.parcelLengthCm ?? null;
      const width = item.offer.parcelWidthCm ?? null;
      const height = item.offer.parcelHeightCm ?? null;

      if (!weight || !length || !width || !height || weight < 1 || length < 1 || width < 1 || height < 1) {
        throw new BadRequestException('Offer parcel weight and dimensions are required for integrated shipping');
      }

      parcelWeightGrams += weight * item.quantity;
      parcelLengthCm = Math.max(parcelLengthCm, length);
      parcelWidthCm = Math.max(parcelWidthCm, width);
      parcelHeightCm += height * item.quantity;
    }

    return {
      parcelWeightGrams,
      parcelLengthCm,
      parcelWidthCm,
      parcelHeightCm,
    };
  }

  private sumStaticProviderFees(group: ShopCartItemGroup, providerCode: string) {
    return group.items.reduce((total, item) => {
      const method = item.offer.shippingMethods.find((shippingMethod) => shippingMethod.providerCode === providerCode);
      return total + Number(method?.shippingFee?.toString() ?? 0);
    }, 0);
  }

  private resolveDefaultShippingFee(options: CartShippingOption[]) {
    if (options.length === 0) {
      return 0;
    }

    return Math.min(...options.map((option) => option.shippingFee));
  }

  private async resolveShippingDestination(input: {
    buyerUserId: string;
    shippingAddress?: string | null;
    shippingDistrictId?: number | null;
    shippingWardCode?: string | null;
  }): Promise<ShippingQuoteDestination> {
    if (input.shippingDistrictId && input.shippingWardCode?.trim()) {
      return {
        shippingAddress: input.shippingAddress ?? null,
        shippingDistrictId: input.shippingDistrictId,
        shippingWardCode: input.shippingWardCode,
      };
    }

    const defaultAddress = await this.ordersRepository.findDefaultAddressByUserId(input.buyerUserId);
    const carrierLocation = parseInternalAddressWardCode(defaultAddress?.wardCode);
    return {
      shippingAddress: defaultAddress?.addressLine ?? null,
      shippingDistrictId: carrierLocation?.districtId ?? null,
      shippingWardCode: carrierLocation?.carrierWardCode ?? null,
    };
  }

  private estimateGhnDelivery(shortName: string) {
    const normalized = shortName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (normalized.includes('nhanh')) {
      return '2-3 ngay';
    }

    if (normalized.includes('chuan') || normalized.includes('tiet kiem')) {
      return '3-4 ngay';
    }

    return null;
  }
}

type ShopCartItemGroup = {
  shopId: string;
  shopName: string;
  warehouseAddress: string | null;
  warehouseWardCode: string | null;
  warehouseWardName: string | null;
  items: CartWithItems['items'];
};

type ShippingQuoteDestination = {
  shippingAddress: string | null;
  shippingDistrictId: number | null;
  shippingWardCode: string | null;
};

function parseInternalAddressWardCode(wardCode?: string | null) {
  const match = wardCode?.trim().match(/^VN-P(\d+)-D(\d+)-W(.+)$/);
  if (!match) {
    return null;
  }

  return {
    districtId: Number(match[2]),
    carrierWardCode: match[3],
  };
}

type CartShippingOption = {
  optionCode: string;
  providerCode: string;
  providerName: string;
  methodName: string;
  shippingFee: number;
  estimatedDelivery: string | null;
};

type CartShopShippingOptions = {
  shopId: string;
  shopName: string;
  options: CartShippingOption[];
};

type CartShippingOptionsResponse = {
  shops: CartShopShippingOptions[];
  totalShippingFee: number;
};
