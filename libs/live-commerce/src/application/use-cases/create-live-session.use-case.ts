import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from '@media';
import { LiveCommerceRepository } from '../../infrastructure/persistence/live-commerce.repository';
import { agoraChannelName } from '../agora-rtc';
import { toLiveSessionResponse } from '../live-commerce.mapper';

@Injectable()
export class CreateLiveSessionUseCase {
  constructor(
    private readonly liveCommerceRepository: LiveCommerceRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    sessionId: string;
    requesterUserId: string;
    shopId: string;
    title: string;
    description?: string | null;
    coverImage?: {
      buffer: Buffer | { data?: number[] };
      mimetype: string;
      originalname?: string;
      size: number;
    } | null;
    startAt: string;
    offerIds?: string[];
    voucherIds?: string[];
  }) {
    const title = input.title.trim();
    if (!title) {
      throw new BadRequestException('Live session title is required');
    }

    const startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Live session startAt is invalid');
    }
    const shop = await this.liveCommerceRepository.findShopForLiveSession(
      input.shopId,
    );
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only shop owner can create live sessions');
    }
    if (shop.shopStatus !== 'verified') {
      throw new BadRequestException(
        'Only active shops can create live sessions',
      );
    }

    const offerIds = [
      ...new Set(
        (input.offerIds ?? []).map((offerId) => offerId.trim()).filter(Boolean),
      ),
    ];
    if (offerIds.length) {
      const offers =
        await this.liveCommerceRepository.findOffersForLiveSession(offerIds);
      if (offers.length !== offerIds.length) {
        throw new NotFoundException('One or more live offers were not found');
      }

      const invalidOffer = offers.find(
        (offer) =>
          offer.shopId !== input.shopId ||
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

    const voucherIds = [
      ...new Set(
        (input.voucherIds ?? [])
          .map((voucherId) => voucherId.trim())
          .filter(Boolean),
      ),
    ];
    if (voucherIds.length) {
      const vouchers =
        await this.liveCommerceRepository.findVouchersForLiveSession(
          voucherIds,
        );
      if (vouchers.length !== voucherIds.length) {
        throw new NotFoundException('One or more live vouchers were not found');
      }
      const invalidVoucher = vouchers.find(
        (voucher) =>
          voucher.ownerType !== 'SHOP' ||
          voucher.shopId !== input.shopId ||
          voucher.status !== 'ACTIVE' ||
          voucher.startsAt > startAt ||
          voucher.endsAt < startAt,
      );
      if (invalidVoucher) {
        throw new BadRequestException(
          'Live vouchers must be active shop vouchers valid at start time',
        );
      }
    }

    const coverImage = input.coverImage
      ? validateCoverImage(input.coverImage)
      : null;
    const uploadedCover = coverImage
      ? await this.mediaService.uploadCloudinaryBuffer({
          buffer: coverImage.buffer,
          folder: 'live/session-covers',
          requesterUserId: input.requesterUserId,
          assetType: 'IMAGE',
          mimeType: coverImage.mimetype,
        })
      : null;

    let session: Awaited<
      ReturnType<LiveCommerceRepository['createLiveSession']>
    >;
    try {
      session = await this.liveCommerceRepository.createLiveSession({
        sessionId: input.sessionId,
        shopId: input.shopId,
        title,
        description: input.description?.trim() || null,
        coverUrl: uploadedCover?.secureUrl ?? null,
        startAt,
        playbackUrl: null,
        streamProvider: 'AGORA_RTC',
        streamProviderSessionId: agoraChannelName(input.sessionId),
        streamIngestUrl: null,
        providerStatus: 'READY',
        streamLatencyTargetMs: 1000,
        recordingUrl: null,
        recordingRetentionDays: null,
        offerIds,
        voucherIds,
        requesterUserId: input.requesterUserId,
      });
    } catch (error) {
      if (uploadedCover) {
        try {
          await this.mediaService.deleteCloudinaryAsset({
            publicId: uploadedCover.publicId,
            assetType: 'IMAGE',
          });
        } catch {
          // Preserve the original persistence error; cleanup is best-effort.
        }
      }
      throw error;
    }
    return toLiveSessionResponse(session, input.requesterUserId);
  }
}

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateCoverImage(file: {
  buffer: Buffer | { data?: number[] };
  mimetype: string;
  originalname?: string;
  size: number;
}) {
  const buffer = normalizeBuffer(file.buffer);
  const mimetype = file.mimetype.trim().toLowerCase();
  if (!buffer.length || file.size <= 0) {
    throw new BadRequestException('Live cover image is empty');
  }
  if (file.size > MAX_COVER_BYTES || buffer.length > MAX_COVER_BYTES) {
    throw new BadRequestException('Live cover image must not exceed 5 MB');
  }
  if (
    !COVER_MIME_TYPES.has(mimetype) ||
    !matchesImageSignature(buffer, mimetype)
  ) {
    throw new BadRequestException('Live cover image must be JPG, PNG, or WEBP');
  }

  return { ...file, buffer, mimetype };
}

function normalizeBuffer(buffer: Buffer | { data?: number[] }) {
  if (Buffer.isBuffer(buffer)) {
    return buffer;
  }
  if (Array.isArray(buffer?.data)) {
    return Buffer.from(buffer.data);
  }
  throw new BadRequestException('Live cover image is invalid');
}

function matchesImageSignature(buffer: Buffer, mimetype: string) {
  if (mimetype === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (mimetype === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
