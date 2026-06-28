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

  async uploadBuffer(input: {
    buffer: Buffer;
    folder: string;
    requesterUserId: string;
    assetType: 'IMAGE' | 'VIDEO';
    mimeType: string;
    sequence?: number;
  }) {
    const params = this.createSignedUploadParams({
      folder: input.folder,
      requesterUserId: input.requesterUserId,
      assetType: input.assetType,
      sequence: input.sequence,
    });
    const formData = new FormData();
    formData.append('file', `data:${input.mimeType};base64,${input.buffer.toString('base64')}`);
    formData.append('api_key', params.apiKey);
    formData.append('timestamp', String(params.timestamp));
    formData.append('folder', params.folder);
    formData.append('public_id', params.publicId);
    formData.append('signature', params.signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${params.cloudName}/${params.uploadResourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );
    if (!response.ok) {
      throw new InternalServerErrorException('Cloudinary upload failed');
    }

    const payload = (await response.json()) as {
      public_id?: string;
      secure_url?: string;
      resource_type?: string;
    };
    if (!payload.public_id || !payload.secure_url) {
      throw new InternalServerErrorException('Cloudinary upload response is invalid');
    }

    return {
      publicId: payload.public_id,
      secureUrl: payload.secure_url,
      uploadResourceType: payload.resource_type ?? params.uploadResourceType,
    };
  }

  async deleteAsset(input: {
    publicId: string;
    assetType: 'IMAGE' | 'VIDEO';
  }) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException('Cloudinary configuration is missing');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `public_id=${input.publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signaturePayload).digest('hex');
    const formData = new FormData();
    formData.append('public_id', input.publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${this.toCloudinaryResourceType(input.assetType)}/destroy`,
      {
        method: 'POST',
        body: formData,
      },
    );
    if (!response.ok) {
      throw new InternalServerErrorException('Cloudinary delete failed');
    }
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
