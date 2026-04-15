import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateAccountResponse } from './affiliate.mapper';

@Injectable()
export class JoinAffiliateProgramUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    programId: string;
    referralCode?: string | null;
  }) {
    const program = await this.repository.findProgramForJoin(input.programId);
    if (!program) {
      throw new NotFoundException('Affiliate program not found');
    }

    if (program.programStatus !== 'ACTIVE') {
      throw new BadRequestException('Affiliate program is not active');
    }

    const existingAccount = await this.repository.findAffiliateAccountByProgramAndUser(
      input.programId,
      input.requesterUserId,
    );
    if (existingAccount) {
      throw new BadRequestException('User has already joined this affiliate program');
    }

    let parentAccountId: string | null = null;
    let referralPath: string | null = null;

    if (input.referralCode) {
      const referral = await this.repository.findAffiliateCodeByCode(input.referralCode.trim().toLowerCase());
      if (!referral || referral.programId !== input.programId) {
        throw new BadRequestException('Referral code is invalid for this affiliate program');
      }

      if (referral.expiresAt && referral.expiresAt < new Date()) {
        throw new BadRequestException('Referral code has expired');
      }

      if (referral.account.accountStatus !== 'ACTIVE') {
        throw new BadRequestException('Referral code owner is not active');
      }

      parentAccountId = referral.accountId;
      referralPath = referral.account.referralPath
        ? `${referral.account.referralPath}/${referral.accountId}`
        : referral.accountId;
    }

    const account = await this.repository.createAffiliateAccount({
      programId: input.programId,
      userId: input.requesterUserId,
      parentAccountId,
      referralPath,
    });

    return toAffiliateAccountResponse(account);
  }
}
