import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { ShippingCarrierAdapterService } from '../services';

@Injectable()
export class QuoteCartItemShippingOptionsUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly shippingCarrierAdapterService: ShippingCarrierAdapterService,
  ) {}

  async execute(input: {
    buyerUserId: string;
    cartItemId: string;
    shippingAddress?: string | null;
    shippingDistrictId?: number | null;
    shippingWardCode?: string | null;
  }) {
    const cartItem = await this.ordersRepository.findCartItemById(input.cartItemId);
    if (!cartItem || cartItem.cart.buyerUserId !== input.buyerUserId || cartItem.cart.cartStatus !== 'ACTIVE') {
      throw new NotFoundException('Cart item not found');
    }

    const offer = await this.ordersRepository.findOfferForOrdering(cartItem.offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (!cartItem.variantId) {
      throw new BadRequestException('Variant is required for this cart item');
    }
    const variant = await this.ordersRepository.findOfferVariantForOrdering({
      offerId: offer.id,
      variantId: cartItem.variantId,
    });
    if (!variant || !variant.isActive || variant.price === null) {
      throw new BadRequestException('Variant is unavailable');
    }

    const baseAmount = Number(variant.price.toString()) * cartItem.quantity;
    const options: CartItemShippingOption[] = [];
    const carriers = await this.ordersRepository.findActiveShippingCarriers();
    for (const carrier of carriers) {
      if (carrier.code === 'GHN') {
        options.push(...(await this.quoteGhnOptions(input, offer, baseAmount)));
        continue;
      }

      options.push({
        providerCode: carrier.code,
        providerName: carrier.name,
        label: carrier.name,
        description: carrier.description ?? null,
        shippingFee: 0,
        shippingServiceId: null,
        shippingServiceTypeId: null,
      });
    }

    return options;
  }

  private async quoteGhnOptions(
    input: {
      shippingAddress?: string | null;
      shippingDistrictId?: number | null;
      shippingWardCode?: string | null;
    },
    offer: OfferForOrdering,
    baseAmount: number,
  ) {
    if (!input.shippingDistrictId || !input.shippingWardCode?.trim()) {
      return [];
    }

    const parcel = this.resolveShippingParcel(offer);
    const services = await this.shippingCarrierAdapterService.listGhnServices(input.shippingDistrictId);
    const quoted = await Promise.all(
      services.map(async (service) => {
        const quote = await this.shippingCarrierAdapterService.quoteShipment({
          providerCode: 'GHN',
          shippingName: null,
          shippingPhone: null,
          shippingAddress: input.shippingAddress ?? null,
          shippingDistrictId: input.shippingDistrictId ?? null,
          shippingWardCode: input.shippingWardCode ?? null,
          shippingServiceId: service.serviceId,
          shippingServiceTypeId: service.serviceTypeId,
          ...parcel,
          itemName: offer.title,
          declaredValue: baseAmount,
          fallbackFee: 0,
        });

        return {
          providerCode: 'GHN',
          providerName: 'Giao Hang Nhanh',
          label: service.shortName || 'GHN',
          description: service.serviceId ? `Service ${service.serviceId}` : `Service type ${service.serviceTypeId}`,
          shippingFee: quote.shippingFeeAmount,
          shippingServiceId: quote.serviceId,
          shippingServiceTypeId: quote.serviceTypeId,
        };
      }),
    );

    return quoted.filter((option) => option.shippingFee > 0);
  }

  private resolveShippingParcel(offer: OfferForOrdering) {
    const parcel = {
      parcelWeightGrams: offer.parcelWeightGrams ?? null,
      parcelLengthCm: offer.parcelLengthCm ?? null,
      parcelWidthCm: offer.parcelWidthCm ?? null,
      parcelHeightCm: offer.parcelHeightCm ?? null,
    };

    if (Object.values(parcel).some((value) => !value || value < 1)) {
      throw new BadRequestException('Offer parcel weight and dimensions are required for integrated shipping');
    }

    return parcel;
  }
}

type CartItemShippingOption = {
  providerCode: string;
  providerName: string;
  label: string;
  description: string | null;
  shippingFee: number;
  shippingServiceId: number | null;
  shippingServiceTypeId: number | null;
};
