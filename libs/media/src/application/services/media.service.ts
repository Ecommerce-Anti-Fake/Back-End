import { Injectable } from '@nestjs/common';
import { MediaAssetType, MediaResourceType } from '@prisma/client';
import { CloudinaryService } from '../../infrastructure/cloudinary/cloudinary.service';
import { MediaRepository } from '../../infrastructure/persistence/media.repository';

@Injectable()
export class MediaService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly mediaRepository: MediaRepository,
  ) {}

  createCloudinaryUploadSignature(input: {
    folder: string;
    requesterUserId: string;
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    sequence?: number;
  }) {
    return this.cloudinaryService.createSignedUploadParams(input);
  }

  uploadCloudinaryBuffer(input: {
    buffer: Buffer;
    folder: string;
    requesterUserId: string;
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    mimeType: string;
    sequence?: number;
  }) {
    return this.cloudinaryService.uploadBuffer(input);
  }

  deleteCloudinaryAsset(input: {
    publicId: string;
    assetType: 'IMAGE' | 'VIDEO';
  }) {
    return this.cloudinaryService.deleteAsset(input);
  }

  isOwnedCloudinaryUrl(fileUrl: string) {
    return this.cloudinaryService.isOwnedUrl(fileUrl);
  }

  createCloudinaryAsset(input: {
  ownerUserId: string;
  assetType: MediaAssetType;
  resourceType: MediaResourceType;
  publicId: string;
  secureUrl: string;
  mimeType?: string | null;
  folder?: string | null;
}) {
  return this.mediaRepository.createAsset({
    ownerUserId: input.ownerUserId,
    provider: 'CLOUDINARY',
    assetType: input.assetType,
    resourceType: input.resourceType,
    publicId: input.publicId,
    secureUrl: input.secureUrl,
    mimeType: input.mimeType ?? null,
    folder: input.folder ?? null,
  });
}
}
