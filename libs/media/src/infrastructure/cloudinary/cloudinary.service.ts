import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}

  createSignedUploadParams(input: {
    folder: string;
    requesterUserId: string;
    assetType: 'IMAGE' | 'VIDEO' | 'RAW';
    sequence?: number;
  }) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary configuration is missing');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const sequenceSuffix = input.sequence ? `-${input.sequence}` : '';
    const publicId = `${input.folder}/${input.requesterUserId}-${timestamp}${sequenceSuffix}`;
    const signaturePayload = `folder=${input.folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signaturePayload).digest('hex');

    return {
      cloudName,
      apiKey,
      timestamp,
      folder: input.folder,
      publicId,
      uploadResourceType: this.toCloudinaryResourceType(input.assetType),
      signature,
    };
  }

  isOwnedUrl(fileUrl: string) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    if (!cloudName) {
      throw new InternalServerErrorException('Cloudinary configuration is missing');
    }

    return fileUrl.startsWith(`https://res.cloudinary.com/${cloudName}/`);
  }

  private toCloudinaryResourceType(assetType: 'IMAGE' | 'VIDEO' | 'RAW') {
    if (assetType === 'VIDEO') {
      return 'video';
    }

    if (assetType === 'RAW') {
      return 'raw';
    }

    return 'image';
  }
}
