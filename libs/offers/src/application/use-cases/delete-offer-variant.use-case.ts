import { Injectable, NotFoundException } from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';

@Injectable()
export class DeleteOfferVariantUseCase {
  constructor(private readonly offersRepository: OffersRepository) {}

  async execute(input: {
    offerId: string;
    variantId: string;
    sellerUserId: string;
  }) {
    const variant = await this.offersRepository.updateOwnedOfferVariant({
      ...input,
      data: { isActive: false, price: 0, availableQuantity: 0 },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return { success: true as const, message: 'Xóa variant thành công.' };
  }
}
