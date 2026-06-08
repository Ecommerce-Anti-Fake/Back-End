import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toLiveSessionResponse } from './products.mapper';

@Injectable()
export class CreateLiveSessionUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(input: {
    requesterUserId: string;
    shopId: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    startAt: string;
    playbackUrl?: string | null;
    streamProvider?: string | null;
    streamProviderSessionId?: string | null;
    streamIngestUrl?: string | null;
    streamLatencyTargetMs?: number | null;
    recordingUrl?: string | null;
    recordingRetentionDays?: number | null;
    offerIds?: string[];
  }) {
    const title = input.title.trim();
    if (!title) {
      throw new BadRequestException('Live session title is required');
    }

    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Live session startAt is invalid');
    }
    if (input.streamLatencyTargetMs !== undefined && input.streamLatencyTargetMs !== null && input.streamLatencyTargetMs < 1000) {
      throw new BadRequestException('Live stream latency target must be at least 1000ms');
    }
    if (input.recordingRetentionDays !== undefined && input.recordingRetentionDays !== null && input.recordingRetentionDays < 1) {
      throw new BadRequestException('Recording retention must be at least 1 day');
    }

    const shop = await this.productRepository.findShopForLiveSession(input.shopId);
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only shop owner can create live sessions');
    }
    if (shop.shopStatus !== 'active') {
      throw new BadRequestException('Only active shops can create live sessions');
    }

    const offerIds = [...new Set((input.offerIds ?? []).map((offerId) => offerId.trim()).filter(Boolean))];
    if (offerIds.length) {
      const offers = await this.productRepository.findOffersForLiveSession(offerIds);
      if (offers.length !== offerIds.length) {
        throw new NotFoundException('One or more live offers were not found');
      }

      const invalidOffer = offers.find((offer) => offer.shopId !== input.shopId || offer.offerStatus !== 'active' || offer.availableQuantity <= 0);
      if (invalidOffer) {
        throw new BadRequestException('Live offers must belong to the shop, be active, and have stock');
      }
    }

    const session = await this.productRepository.createLiveSession({
      shopId: input.shopId,
      title,
      description: input.description?.trim() || null,
      coverUrl: input.coverUrl?.trim() || null,
      startAt,
      playbackUrl: input.playbackUrl?.trim() || null,
      streamProvider: input.streamProvider?.trim() || 'HLS_CDN',
      streamProviderSessionId: input.streamProviderSessionId?.trim() || null,
      streamIngestUrl: input.streamIngestUrl?.trim() || null,
      streamLatencyTargetMs: input.streamLatencyTargetMs ?? null,
      recordingUrl: input.recordingUrl?.trim() || null,
      recordingRetentionDays: input.recordingRetentionDays ?? null,
      offerIds,
      requesterUserId: input.requesterUserId,
    });

    return toLiveSessionResponse(session, input.requesterUserId);
  }
}
