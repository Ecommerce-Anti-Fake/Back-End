import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CatalogMetadataRepository } from '../../infrastructure/persistence/catalog-metadata.repository';

export type VerifyProductInput = {
  code: string;
};

export type VerifyProductResult = {
  status: 'VERIFIED' | 'SUSPICIOUS' | 'INACTIVE' | 'NOT_FOUND';
  labelType: string | null;
  issuedAt: Date | null;
  brandName: string | null;
  productName: string | null;
  modelName: string | null;
  batchNumber: string | null;
  countryOfOrigin: string | null;
  sourceType: string | null;
  provenance: Array<{
    eventType: string;
    channel: string;
    occurredAt: Date;
  }>;
};

@Injectable()
export class VerifyProductUseCase {
  constructor(
    private readonly catalogMetadataRepository: CatalogMetadataRepository,
  ) {}

  async execute(input: VerifyProductInput): Promise<VerifyProductResult> {
    const normalizedCode = normalizeVerificationCode(input.code);
    const codeHash = createHash('sha256').update(normalizedCode).digest('hex');
    const label =
      await this.catalogMetadataRepository.findVerificationLabelByCodeHash(
        codeHash,
      );

    if (!label) {
      return emptyVerificationResult('NOT_FOUND');
    }

    const batch =
      label.scopeType === 'SUPPLY_BATCH'
        ? await this.catalogMetadataRepository.findSupplyBatchVerificationContext(
            label.scopeId,
          )
        : null;

    return {
      status: toPublicVerificationStatus(label.labelStatus),
      labelType: label.labelType,
      issuedAt: label.issuedAt,
      brandName: label.brand.name,
      productName: batch?.offerTitle ?? null,
      modelName: batch?.modelName ?? null,
      batchNumber: batch?.batchNumber ?? null,
      countryOfOrigin: batch?.countryOfOrigin ?? null,
      sourceType: batch?.sourceType ?? null,
      provenance: label.provenance.map((event) => ({
        eventType: event.eventType,
        channel: event.channel,
        occurredAt: event.occurredAt,
      })),
    };
  }
}

function normalizeVerificationCode(value: string) {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Verification code or HTTPS link is required',
    );
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) {
    throw new BadRequestException(
      'Verification code or HTTPS link is required',
    );
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new BadRequestException(
        'Verification code or HTTPS link is required',
      );
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException(
        'Verification code or HTTPS link is required',
      );
    }

    const linkedCode =
      url.searchParams.get('code') ?? url.searchParams.get('verificationCode');
    if (!linkedCode?.trim()) {
      throw new BadRequestException(
        'Verification code or HTTPS link is required',
      );
    }

    return linkedCode.trim().toUpperCase();
  }

  return trimmed.toUpperCase();
}

function toPublicVerificationStatus(labelStatus: string) {
  if (labelStatus === 'active') return 'VERIFIED' as const;
  if (labelStatus === 'suspicious') return 'SUSPICIOUS' as const;
  return 'INACTIVE' as const;
}

function emptyVerificationResult(
  status: VerifyProductResult['status'],
): VerifyProductResult {
  return {
    status,
    labelType: null,
    issuedAt: null,
    brandName: null,
    productName: null,
    modelName: null,
    batchNumber: null,
    countryOfOrigin: null,
    sourceType: null,
    provenance: [],
  };
}
