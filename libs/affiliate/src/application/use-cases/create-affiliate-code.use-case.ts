import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateCodeResponse } from './affiliate.mapper';

@Injectable()
export class CreateAffiliateCodeUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    accountId: string;
    code: string;
    landingUrl?: string | null;
    isDefault?: boolean;
    expiresAt?: string | null;
  }) {
    const account = await this.repository.findOwnedAffiliateAccount(input.accountId, input.requesterUserId);
    if (!account) {
      throw new BadRequestException('Affiliate account is invalid or not owned by current user');
    }

    if (account.accountStatus !== 'ACTIVE') {
      throw new BadRequestException('Only active affiliate accounts can create codes');
    }

    const normalizedCode = input.code.trim().toLowerCase();
    const existingCode = await this.repository.findAffiliateCodeByCode(normalizedCode);
    if (existingCode) {
      throw new BadRequestException('Affiliate code already exists');
    }

    const expiresAt = this.parseOptionalDate(input.expiresAt);

    const code = await this.repository.createAffiliateCode({
      programId: account.programId,
      accountId: account.id,
      code: normalizedCode,
      landingUrl: input.landingUrl?.trim() || null,
      isDefault: input.isDefault ?? false,
      expiresAt,
    });

    return toAffiliateCodeResponse(code);
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid datetime format');
    }

    return date;
  }
}
