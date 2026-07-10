import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferForOrdering, OfferVariantForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CheckoutShippingService } from '../services';
import { CreateOrderUseCase } from './create-order.use-case';

type BuyNowCheckoutInput = {
  buyerUserId: string;
  offerId: string;
  variantId?: string | null;
  quantity: number;
  paymentMethod: 'COD' | 'PAYOS';
  shippingOptionCode: string;
};

@Injectable()
export class BuyNowCheckoutUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly checkoutShippingService: CheckoutShippingService,
    private readonly createOrderUseCase: CreateOrderUseCase,
  ) {}

  async execute(input: BuyNowCheckoutInput) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.offerStatus !== 'active') {
      throw new BadRequestException('Only active offers can be ordered');
    }

    const variant = await this.resolveVariant(input, offer);
    const availableQuantity = variant ? variant.availableQuantity : offer.availableQuantity;
    if (input.quantity > availableQuantity) {
      throw new BadRequestException('Quantity exceeds available stock');
    }
    const unitPrice = Number((variant?.price ?? offer.price).toString());
    const shippingOption = await this.checkoutShippingService.resolveSelectedOption({
      buyerUserId: input.buyerUserId,
      shippingOptionCode: input.shippingOptionCode,
      items: [
        {
          offerId: offer.id,
          quantity: input.quantity,
          unitPrice,
          offer,
        },
      ],
    });
    const shipping = await this.checkoutShippingService.resolveDefaultShipping(input.buyerUserId, shippingOption);

    return this.createOrderUseCase.execute({
      buyerUserId: input.buyerUserId,
      offerId: offer.id,
      variantId: variant?.id ?? null,
      quantity: input.quantity,
      paymentMethod: input.paymentMethod,
      shippingName: shipping.name,
      shippingPhone: shipping.phone,
      shippingAddress: shipping.address,
      shippingDistrictId: shipping.districtId,
      shippingDistrictName: shipping.districtName,
      shippingWardCode: shipping.wardCode,
      shippingWardName: shipping.wardName,
      shippingProviderCode: shippingOption.providerCode,
      shippingServiceId: shippingOption.shippingServiceId,
      shippingServiceTypeId: shippingOption.shippingServiceTypeId,
    });
  }

  private async resolveVariant(input: { variantId?: string | null }, offer: OfferForOrdering) {
    const variantId = input.variantId?.trim() || null;
    if (!variantId) {
      const variantCount = await this.ordersRepository.countOfferVariants(offer.id);
      if (variantCount > 0) {
        throw new BadRequestException('Variant is required for this offer');
      }
      return null;
    }

    const variant = await this.ordersRepository.findOfferVariantForOrdering({
      offerId: offer.id,
      variantId,
    });
    if (!variant || !variant.isActive) {
      throw new BadRequestException('Variant is not available');
    }
    return variant as OfferVariantForOrdering;
  }
}
