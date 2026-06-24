import { Injectable } from '@nestjs/common';
import { Prisma, MediaAssetType, MediaResourceType } from '@prisma/client';
import { PrismaService } from '@database/prisma/prisma.service';

const mediaAssetArgs = Prisma.validator<Prisma.MediaAssetDefaultArgs>()({});

export type MediaAssetRecord = Prisma.MediaAssetGetPayload<typeof mediaAssetArgs>;

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  createAsset(input: {
    ownerUserId: string;
    provider: 'CLOUDINARY';
    assetType: MediaAssetType;
    resourceType: MediaResourceType;
    publicId: string | null;
    secureUrl: string;
    mimeType: string | null;
    folder: string | null;
  }): Promise<MediaAssetRecord> {
    return this.prisma.mediaAsset.create({
      data: {
        ownerUserId: input.ownerUserId,
        provider: input.provider,
        assetType: input.assetType,
        resourceType: input.resourceType,
        publicId: input.publicId,
        secureUrl: input.secureUrl,
        mimeType: input.mimeType,
        folder: input.folder,
      },
      ...mediaAssetArgs,
    });
  }
}