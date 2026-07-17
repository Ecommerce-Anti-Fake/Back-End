import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferForOrdering, OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CheckoutShippingService } from '../services';

type Input = { buyerUserId: string; offerId: string; variantId?: string | null; quantity: number };

@Injectable()
export class QuoteBuyNowShippingOptionsUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly checkoutShippingService: CheckoutShippingService,
  ) {}

  async execute(input: Input) {
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new BadRequestException('Số lượng phải lớn hơn 0.');
    }
    const offer = await this.ordersRepository.findOfferForOrdering(input.offerId);
    if (!offer) throw new NotFoundException('Không tìm thấy offer.');
    if (offer.offerStatus !== 'active' || offer.moderationStatus !== 'approved') {
      throw new BadRequestException('Offer không khả dụng để Mua ngay.');
    }
    const variant = await this.resolveVariant(input.variantId, offer);
    if (!variant) {
      throw new BadRequestException('Vui lòng chọn variant cho offer này.');
    }
    if (variant.price === null) {
      throw new BadRequestException('Variant chưa được cấu hình giá.');
    }
    if (input.quantity > variant.availableQuantity) {
      throw new BadRequestException('Số lượng vượt quá tồn kho.');
    }
    const quoted = await this.checkoutShippingService.quoteOptionsForItems({
      buyerUserId: input.buyerUserId,
      items: [{
        offerId: offer.id,
        quantity: input.quantity,
        unitPrice: Number(variant.price.toString()),
        offer,
      }],
    });
    return this.checkoutShippingService.toPublicOptions(quoted.options);
  }

  private async resolveVariant(variantIdInput: string | null | undefined, offer: OfferForOrdering) {
    const variantId = variantIdInput?.trim() || null;
    if (!variantId) {
      if ((await this.ordersRepository.countOfferVariants(offer.id)) > 0) {
        throw new BadRequestException('Vui lòng chọn variant cho offer này.');
      }
      return null;
    }
    const variant = await this.ordersRepository.findOfferVariantForOrdering({ offerId: offer.id, variantId });
    if (!variant || !variant.isActive) throw new BadRequestException('Variant không khả dụng.');
    return variant;
  }
}
