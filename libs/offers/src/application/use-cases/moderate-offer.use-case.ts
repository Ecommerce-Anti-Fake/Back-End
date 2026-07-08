import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferResponse } from './offers.mapper';

@Injectable()
export class ModerateOfferUseCase {
  constructor(private readonly offersRepository: OffersRepository) {}

  async execute(input: {
    offerId: string;
    moderationStatus: 'pending' | 'approved' | 'rejected' | 'banned';
    moderationReason: string | null;
  }) {
    const moderationReason = input.moderationReason?.trim() ?? null;
    if (moderationReason !== null && moderationReason.length > 1000) {
      throw new BadRequestException(
        'Moderation reason must not exceed 1000 characters',
      );
    }
    const offer = await this.offersRepository.moderateOffer(input.offerId, {
      moderationStatus: input.moderationStatus,
      moderationReason,
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    return toOfferResponse(offer);
  }
}
