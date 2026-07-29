import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class UpdateLiveSessionOffersUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
  ) {}

  async execute(input: {
    sessionId: string;
    requesterUserId: string;
    requesterRole?: string | null;
    offerIds: string[];
  }) {
    const session = await this.liveCommerceRepository.findLiveSessionById(
      input.sessionId,
      input.requesterUserId,
    );
    if (!session) {
      throw new NotFoundException('Live session not found');
    }
    const shop = await this.liveCommerceRepository.findShopForLiveSession(
      session.shopId,
    );
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (
      input.requesterRole !== 'admin' &&
      shop.ownerUserId !== input.requesterUserId
    ) {
      throw new ForbiddenException(
        'Only shop owner or admin can update live session offers',
      );
    }
    if (session.status !== 'SCHEDULED' && session.status !== 'LIVE') {
      throw new BadRequestException(
        'Only scheduled or live sessions can update offers',
      );
    }

    const offerIds = [
      ...new Set(
        input.offerIds.map((offerId) => offerId.trim()).filter(Boolean),
      ),
    ];
    if (session.pinnedOfferId && !offerIds.includes(session.pinnedOfferId)) {
      throw new ConflictException(
        'Unpin or switch the pinned offer before removing it',
      );
    }
    if (offerIds.length) {
      const offers =
        await this.liveCommerceRepository.findOffersForLiveSession(offerIds);
      if (offers.length !== offerIds.length) {
        throw new NotFoundException('One or more live offers were not found');
      }
      const invalidOffer = offers.find(
        (offer) =>
          offer.shopId !== session.shopId ||
          offer.offerStatus !== 'active' ||
          offer.variants.reduce(
            (sum, variant) => sum + variant.availableQuantity,
            0,
          ) <= 0,
      );
      if (invalidOffer) {
        throw new BadRequestException(
          'Live offers must belong to the shop, be active, and have stock',
        );
      }
    }

    const result =
      await this.liveCommerceRepository.replaceLiveSessionOffersAtomic({
        sessionId: input.sessionId,
        offerIds,
        requesterUserId: input.requesterUserId,
      });
    if (result.kind === 'NOT_FOUND') {
      throw new NotFoundException('Live session not found');
    }
    if (result.kind === 'INVALID_STATUS') {
      throw new BadRequestException(
        'Only scheduled or live sessions can update offers',
      );
    }
    if (result.kind === 'PINNED_OFFER_CONFLICT') {
      throw new ConflictException(
        'Unpin or switch the pinned offer before removing it',
      );
    }

    return {
      changed: result.changed,
      session: toLiveSessionResponse(result.session, input.requesterUserId),
    };
  }
}
