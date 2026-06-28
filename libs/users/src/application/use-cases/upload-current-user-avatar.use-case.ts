import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '@media';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

const AVATAR_FOLDER = 'users/avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

@Injectable()
export class UploadCurrentUserAvatarUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    userId: string;
    avatar?: {
      buffer: Buffer | { data?: number[] };
      mimetype: string;
      originalname?: string;
      size: number;
    };
  }) {
    const current = await this.usersRepository.findById(input.userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    const avatar = this.validateAvatar(input.avatar);
    const uploaded = await this.mediaService.uploadCloudinaryBuffer({
      buffer: avatar.buffer,
      folder: AVATAR_FOLDER,
      requesterUserId: input.userId,
      assetType: 'IMAGE',
      mimeType: avatar.mimetype,
    });

    let mediaAsset;
    let previousAvatarPublicId: string | null = null;
    try {
      mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.userId,
        assetType: 'IMAGE',
        resourceType: 'USER_AVATAR',
        publicId: uploaded.publicId,
        secureUrl: uploaded.secureUrl,
        mimeType: avatar.mimetype,
        folder: AVATAR_FOLDER,
      });

      const replaced = await this.usersRepository.replaceUserAvatar(input.userId, mediaAsset.id);
      previousAvatarPublicId = replaced.previousAvatar?.publicId ?? null;
    } catch (error) {
      await this.mediaService.deleteCloudinaryAsset({
        publicId: uploaded.publicId,
        assetType: 'IMAGE',
      });
      throw error;
    }

    if (previousAvatarPublicId) {
      await this.mediaService.deleteCloudinaryAsset({
        publicId: previousAvatarPublicId,
        assetType: 'IMAGE',
      });
    }

    return {
      success: true,
      message: 'Avatar uploaded successfully.',
      mediaAssetId: mediaAsset.id,
      avatarUrl: uploaded.secureUrl,
    };
  }

  private validateAvatar(file?: {
    buffer: Buffer | { data?: number[] };
    mimetype: string;
    size: number;
  }) {
    if (!file) {
      throw new BadRequestException('Avatar image is required');
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Avatar must be an image');
    }

    const buffer = normalizeBuffer(file.buffer);
    if (!buffer.length || file.size <= 0) {
      throw new BadRequestException('Avatar image is empty');
    }

    if (file.size > MAX_AVATAR_BYTES || buffer.length > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Avatar image is too large');
    }

    return {
      buffer,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}

function normalizeBuffer(buffer: Buffer | { data?: number[] }) {
  if (Buffer.isBuffer(buffer)) {
    return buffer;
  }

  if (Array.isArray(buffer?.data)) {
    return Buffer.from(buffer.data);
  }

  throw new BadRequestException('Avatar image is invalid');
}
