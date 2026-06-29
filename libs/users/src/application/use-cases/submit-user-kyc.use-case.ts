import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { MediaService } from '@media';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserKycResponse } from './users-kyc.mapper';

const DOCUMENT_ONLY_DATE_OF_BIRTH = new Date('1970-01-01T00:00:00.000Z');

@Injectable()
export class SubmitUserKycUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    userId: string;
    idType: string;
    documents: Array<{
      side: 'FRONT' | 'BACK';
      assetType: 'IMAGE';
      mimeType: string;
      fileUrl: string;
      publicId: string;
    }>;
  }) {
    const user = await this.usersRepository.findUserById(input.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingKyc = await this.usersRepository.findUserKycByUserId(input.userId);

    const fullName = user.displayName?.trim() || user.email?.trim() || user.phone?.trim() || input.userId;
    const idType = input.idType.trim().toUpperCase();

    if (!idType) {
      throw new BadRequestException('ID type is required');
    }

    const uniqueSides = new Set(input.documents.map((document) => document.side));
    if (
      input.documents.length !== 2 ||
      uniqueSides.size !== 2 ||
      !uniqueSides.has('FRONT') ||
      !uniqueSides.has('BACK')
    ) {
      throw new BadRequestException('KYC documents must include exactly FRONT and BACK images');
    }

    const createdAssets: Array<{ side: 'FRONT' | 'BACK'; mediaAssetId: string }> = [];
    for (const document of input.documents) {
      if (document.assetType !== 'IMAGE') {
        throw new BadRequestException('KYC documents must be uploaded as images');
      }

      if (!this.mediaService.isOwnedCloudinaryUrl(document.fileUrl)) {
        throw new BadRequestException('KYC document URL must belong to the configured Cloudinary cloud');
      }

      const publicId = document.publicId.trim();
      if (!publicId.startsWith(`kyc/${input.userId}/`)) {
        throw new BadRequestException('KYC document public ID does not belong to the user KYC folder');
      }

      const mimeType = document.mimeType.trim().toLowerCase();
      if (!mimeType.startsWith('image/')) {
        throw new BadRequestException('KYC document MIME type must be an image');
      }

      const mediaAsset = await this.mediaService.createCloudinaryAsset({
        ownerUserId: input.userId,
        assetType: 'IMAGE',
        resourceType: 'KYC_DOCUMENT',
        publicId,
        secureUrl: document.fileUrl,
        mimeType,
        folder: `kyc/${input.userId}`,
      });

      createdAssets.push({
        side: document.side,
        mediaAssetId: mediaAsset.id,
      });
    }

    const kyc = await this.usersRepository.submitKyc({
      userId: input.userId,
      fullName,
      dateOfBirth: DOCUMENT_ONLY_DATE_OF_BIRTH,
      idType,
      idNumberHash: this.hashIdNumber(`document-only:${input.userId}:${idType}`),
      documentMediaAssets: createdAssets,
    });

    await this.usersRepository.createAuditLog({
      targetType: 'USER_KYC',
      targetId: kyc.id,
      actorUserId: input.userId,
      action: 'KYC_SUBMITTED',
      fromStatus: existingKyc?.verificationStatus ?? null,
      toStatus: 'pending',
      metadata: {
        documentSides: input.documents.map((document) => document.side),
      },
    });

    return toUserKycResponse(kyc);
  }

  private hashIdNumber(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }
}
