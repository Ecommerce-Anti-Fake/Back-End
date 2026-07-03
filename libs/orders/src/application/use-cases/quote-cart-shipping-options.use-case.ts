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
    cartItemIds: string[];
  }): Promise<CartShippingOptionsResponse> {
    const cart = await this.ordersRepository.getOrCreateActiveCart(input.buyerUserId);
    const selectedCart = this.selectCartItems(cart, input.cartItemIds);
    const destination = await this.resolveShippingDestination(input.buyerUserId);
    const shopGroups = this.groupItemsByShop(selectedCart);
    const shops: CartShopShippingOptions[] = [];

    for (const group of shopGroups) {
      const options = await this.quoteShopOptions(destination, group);
      shops.push({
        shopId: group.shopId,
        shopName: group.shopName,
        options,
      });
    }

    const options = this.aggregateShopOptions(shops);
    return {
      options,
    };
  }

  private selectCartItems(cart: CartWithItems, cartItemIds: string[]): CartWithItems {
    const uniqueCartItemIds = [...new Set(cartItemIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueCartItemIds.length === 0) {
      throw new BadRequestException('At least one cart item is required for shipping quote');
    }

    const selectedItems = cart.items.filter((item) => uniqueCartItemIds.includes(item.id));
    if (selectedItems.length !== uniqueCartItemIds.length) {
      throw new BadRequestException('One or more cart items are invalid');
    }

    return {
      ...cart,
      items: selectedItems,
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
    const carriers = await this.ordersRepository.findActiveShippingCarriers();
    const options: CartShippingOption[] = [];

    for (const carrier of carriers) {
      if (carrier.code === 'GHN') {
        options.push(...(await this.quoteGhnShopOptions(destination, group)));
        continue;
      }

      options.push({
        optionCode: carrier.code,
        providerCode: carrier.code,
        providerName: carrier.name,
        methodName: carrier.name,
        shippingFee: 0,
        estimatedDelivery: null,
      });
    }

    return options;
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

  private async resolveShippingDestination(buyerUserId: string): Promise<ShippingQuoteDestination> {
    const defaultAddress = await this.ordersRepository.findDefaultAddressByUserId(buyerUserId);
    const carrierLocation = parseInternalAddressWardCode(defaultAddress?.wardCode);
    return {
      shippingAddress: defaultAddress?.addressLine ?? null,
      shippingDistrictId: carrierLocation?.districtId ?? null,
      shippingWardCode: carrierLocation?.carrierWardCode ?? null,
    };
  }

  private aggregateShopOptions(shops: CartShopShippingOptions[]) {
    if (shops.length === 0) {
      return [];
    }

    const optionGroups = new Map<string, CartShippingOption[]>();
    for (const shop of shops) {
      const seenShopOptionKeys = new Set<string>();
      for (const option of shop.options) {
        const key = this.resolveAggregateOptionKey(option);
        if (seenShopOptionKeys.has(key)) {
          continue;
        }
        seenShopOptionKeys.add(key);
        optionGroups.set(key, [...(optionGroups.get(key) ?? []), option]);
      }
    }

    return Array.from(optionGroups.values())
      .filter((options) => options.length === shops.length)
      .map((options, index) => {
        const baseOption = options[0];
        return {
          optionCode: `${baseOption.providerCode}_${index + 1}`,
          providerCode: baseOption.providerCode,
          providerName: baseOption.providerName,
          methodName: baseOption.methodName,
          shippingFee: options.reduce((total, option) => total + option.shippingFee, 0),
          estimatedDelivery: this.resolveLongestEstimatedDelivery(options),
        };
      });
  }

  private resolveAggregateOptionKey(option: CartShippingOption) {
    return `${option.providerCode}:${option.methodName.trim().toLowerCase()}`;
  }

  private resolveLongestEstimatedDelivery(options: CartShippingOption[]) {
    return options
      .map((option) => option.estimatedDelivery)
      .filter((value): value is string => !!value)
      .sort((left, right) => this.resolveEstimatedDeliveryMaxDays(right) - this.resolveEstimatedDeliveryMaxDays(left))[0] ?? null;
  }

  private resolveEstimatedDeliveryMaxDays(value: string) {
    const matches = value.match(/\d+/g);
    if (!matches?.length) {
      return 0;
    }

    return Math.max(...matches.map((match) => Number(match)));
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
  options: CartShippingOption[];
};
