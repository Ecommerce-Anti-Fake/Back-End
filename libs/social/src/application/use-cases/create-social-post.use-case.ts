import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

const NORMAL_POST_LIMIT = 3;
const SHOP_POST_LIMIT = 30;
const QUOTA_WINDOW_DAYS = 7;

@Injectable()
export class CreateSocialPostUseCase {
  constructor(private readonly socialRepository: SocialRepository) {}

  async execute(input: {
    requesterUserId: string;
    authorShopId?: string | null;
    postType: 'SHARE' | 'QUESTION' | 'PRODUCT_SHARE';
    body: string;
    offerId?: string | null;
  }) {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException('Post body is required');
    }

    const authorShopId = input.authorShopId?.trim() || null;
    const offerId = input.offerId?.trim() || null;
    if (input.postType === 'PRODUCT_SHARE' && !offerId) {
      throw new BadRequestException('Product share requires an offer');
    }
    if (input.postType !== 'PRODUCT_SHARE' && offerId) {
      throw new BadRequestException(
        'Only product share posts can attach an offer',
      );
    }

    if (authorShopId) {
      const shop =
        await this.socialRepository.findShopForSocialPost(authorShopId);
      if (!shop) {
        throw new NotFoundException('Shop not found');
      }
      if (shop.ownerUserId !== input.requesterUserId) {
        throw new ForbiddenException('Only shop owner can post as this shop');
      }
      if (shop.shopStatus !== 'verified') {
        throw new BadRequestException('Only active shops can post as shop');
      }
    }

    if (offerId) {
      const offer = await this.socialRepository.findOfferForSocialPost(offerId);
      if (!offer) {
        throw new NotFoundException('Offer not found');
      }
      if (offer.offerStatus !== 'active') {
        throw new BadRequestException('Only active offers can be shared');
      }
    }

    const since = new Date(
      Date.now() - QUOTA_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const postCount = await this.socialRepository.countSocialPostsSince({
      authorUserId: input.requesterUserId,
      authorShopId,
      since,
    });
    const limit = authorShopId ? SHOP_POST_LIMIT : NORMAL_POST_LIMIT;
    if (postCount >= limit) {
      throw new BadRequestException(
        `Social post quota exceeded: ${limit} posts per ${QUOTA_WINDOW_DAYS} days`,
      );
    }

    const post = await this.socialRepository.createSocialPost({
      authorUserId: input.requesterUserId,
      authorShopId,
      offerId,
      postType: input.postType,
      body,
    });

    return toSocialPostResponse(post, input.requesterUserId);
  }
}
