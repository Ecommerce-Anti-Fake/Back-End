import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { MediaService } from '@media';
import { SocialRepository } from '../../infrastructure/persistence/social.repository';
import { toSocialPostResponse } from '../social.mapper';

const NORMAL_POST_LIMIT = 3;
const QUOTA_WINDOW_DAYS = 7;
const MAX_MEDIA_FILES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

@Injectable()
export class CreateSocialPostUseCase {
  constructor(
    private readonly socialRepository: SocialRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    requesterUserId: string;
    postType: 'SHARE' | 'QUESTION' | 'PRODUCT_SHARE';
    body: string;
    media?: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname?: string;
      size: number;
    }>;
  }) {
    const body = input.body.trim();
    if (!body) {
      throw new BadRequestException('Post body is required');
    }

    const mediaFiles = this.validateMediaFiles(input.media ?? []);

    const since = new Date(
      Date.now() - QUOTA_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const postCount = await this.socialRepository.countSocialPostsSince({
      authorUserId: input.requesterUserId,
      authorShopId: null,
      since,
    });
    if (postCount >= NORMAL_POST_LIMIT) {
      throw new BadRequestException(
        `Social post quota exceeded: ${NORMAL_POST_LIMIT} posts per ${QUOTA_WINDOW_DAYS} days`,
      );
    }

    const uploadedMedia = await Promise.all(
      mediaFiles.map(async (file, index) => {
        const assetType = mediaAssetType(file.mimetype);
        const uploaded = await this.mediaService.uploadCloudinaryBuffer({
          buffer: file.buffer,
          folder: 'social/posts',
          requesterUserId: input.requesterUserId,
          assetType,
          mimeType: file.mimetype,
          sequence: index + 1,
        });

        return {
          assetType,
          publicId: uploaded.publicId,
          secureUrl: uploaded.secureUrl,
          mimeType: file.mimetype,
          folder: 'social/posts',
          sortOrder: index,
        };
      }),
    );

    let post;
    try {
      post = await this.socialRepository.createSocialPost({
        authorUserId: input.requesterUserId,
        authorShopId: null,
        offerId: null,
        postType: input.postType,
        body,
        media: uploadedMedia,
      });
    } catch (error) {
      await Promise.allSettled(
        uploadedMedia.map((media) =>
          this.mediaService.deleteCloudinaryAsset({
            publicId: media.publicId,
            assetType: media.assetType,
          }),
        ),
      );
      throw error;
    }

    return toSocialPostResponse(post, input.requesterUserId);
  }

  private validateMediaFiles(files: Array<{
    buffer: Buffer | { data?: number[] };
    mimetype: string;
    originalname?: string;
    size: number;
  }>) {
    if (files.length > MAX_MEDIA_FILES) {
      throw new BadRequestException(`Social posts support up to ${MAX_MEDIA_FILES} media files`);
    }

    return files.map((file) => {
      const buffer = normalizeBuffer(file.buffer);
      const assetType = mediaAssetType(file.mimetype);
      const maxSize = assetType === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (!buffer.length || file.size <= 0) {
        throw new BadRequestException('Uploaded media file is empty');
      }
      if (file.size > maxSize || buffer.length > maxSize) {
        throw new BadRequestException(
          assetType === 'VIDEO'
            ? 'Video file is too large'
            : 'Image file is too large',
        );
      }

      return {
        buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      };
    });
  }
}

function normalizeBuffer(buffer: Buffer | { data?: number[] }) {
  if (Buffer.isBuffer(buffer)) {
    return buffer;
  }

  if (Array.isArray(buffer?.data)) {
    return Buffer.from(buffer.data);
  }

  throw new BadRequestException('Uploaded media file is invalid');
}

function mediaAssetType(mimetype: string): 'IMAGE' | 'VIDEO' {
  if (ALLOWED_IMAGE_TYPES.has(mimetype)) {
    return 'IMAGE';
  }

  if (ALLOWED_VIDEO_TYPES.has(mimetype)) {
    return 'VIDEO';
  }

  throw new BadRequestException('Only image and short video files are allowed');
}
