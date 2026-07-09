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
    if (input.moderationStatus === 'approved') {
      const groups = await this.offersRepository.findOfferOptionGroups(
        input.offerId,
      );
      if (groups.length > 0) {
        const combinations = groups.reduce<string[][]>(
          (result, group) =>
            result.flatMap((combination) =>
              group.values.map((value) => [...combination, value.id]),
            ),
          [[]],
        );
        await this.offersRepository.createMissingOfferVariants(
          input.offerId,
          combinations,
        );
        const refreshed = await this.offersRepository.findOfferById(
          input.offerId,
        );
        return toOfferResponse(refreshed!);
      }
    }
    return toOfferResponse(offer);
  }
}
