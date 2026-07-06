import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { MediaService } from '@media';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserKycResponse } from './users-kyc.mapper';

const DOCUMENT_ONLY_DATE_OF_BIRTH = new Date('1970-01-01T00:00:00.000Z');
const MAX_KYC_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_KYC_DOCUMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type KycDocumentInput = {
  side: 'FRONT' | 'BACK';
  assetType: 'IMAGE';
  mimeType: string;
  file: {
    buffer: Buffer | { data?: number[] };
    mimetype: string;
    originalname?: string;
    size: number;
  };
};

@Injectable()
export class SubmitUserKycUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mediaService: MediaService,
  ) {}

  async execute(input: {
    userId: string;
    idType: string;
    documents: KycDocumentInput[];
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
    const uploadedImages: Array<{ publicId: string; assetType: 'IMAGE' }> = [];

    try {
      for (const [index, document] of input.documents.entries()) {
        if (document.assetType !== 'IMAGE') {
          throw new BadRequestException('KYC documents must be uploaded as images');
        }

        const resolvedDocument = await this.resolveDocumentUpload({
          document,
          userId: input.userId,
          sequence: index + 1,
        });
        if (resolvedDocument.uploadedPublicId) {
          uploadedImages.push({ publicId: resolvedDocument.uploadedPublicId, assetType: 'IMAGE' });
        }

        const mediaAsset = await this.mediaService.createCloudinaryAsset({
          ownerUserId: input.userId,
          assetType: 'IMAGE',
          resourceType: 'KYC_DOCUMENT',
          publicId: resolvedDocument.publicId,
          secureUrl: resolvedDocument.fileUrl,
          mimeType: resolvedDocument.mimeType,
          folder: `kyc/${input.userId}`,
        });

        createdAssets.push({
          side: document.side,
          mediaAssetId: mediaAsset.id,
        });
      }
    } catch (error) {
      await Promise.allSettled(uploadedImages.map((image) => this.mediaService.deleteCloudinaryAsset(image)));
      throw error;
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
    await this.usersRepository.markOwnedShopsAfterKycSubmitted(input.userId);

    return toUserKycResponse(kyc);
  }

  private hashIdNumber(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private async resolveDocumentUpload(input: {
    document: KycDocumentInput;
    userId: string;
    sequence: number;
  }): Promise<{
    fileUrl: string;
    publicId: string;
    mimeType: string;
    uploadedPublicId?: string;
  }> {
    const file = input.document.file;
    const mimetype = this.validateImageMimeType(file.mimetype);
    if (file.size > MAX_KYC_DOCUMENT_BYTES) {
      throw new BadRequestException('KYC document image must be 5MB or smaller');
    }

    const uploaded = await this.mediaService.uploadCloudinaryBuffer({
      buffer: this.toBuffer(file.buffer),
      folder: `kyc/${input.userId}`,
      requesterUserId: input.userId,
      assetType: 'IMAGE',
      mimeType: mimetype,
      sequence: input.sequence,
    });

    return {
      fileUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      mimeType: mimetype,
      uploadedPublicId: uploaded.publicId,
    };
  }

  private validateImageMimeType(value: string) {
    const mimeType = value.trim().toLowerCase();
    if (!ALLOWED_KYC_DOCUMENT_TYPES.has(mimeType)) {
      throw new BadRequestException('KYC document must be a JPG, PNG, or WEBP image');
    }
    return mimeType;
  }

  private toBuffer(buffer: Buffer | { data?: number[] }) {
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer.data ?? []);
  }
}
