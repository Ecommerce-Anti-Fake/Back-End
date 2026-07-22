import { BadRequestException, Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';

@Injectable()
export class ResolveAffiliateAttributionUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { code: string; now?: Date }) {
    const now = input.now ?? new Date();
    const attribution = await this.repository.findAffiliateAttributionByCode(
      input.code.trim().toLowerCase(),
    );

    if (
      !attribution ||
      attribution.account.accountStatus !== 'ACTIVE' ||
      attribution.program.programStatus !== 'ACTIVE' ||
      (attribution.program.startedAt && attribution.program.startedAt > now) ||
      (attribution.program.endedAt && attribution.program.endedAt <= now) ||
      (attribution.expiresAt && attribution.expiresAt <= now)
    ) {
      throw new BadRequestException('Affiliate code is invalid or inactive');
    }

    const windowExpiry = new Date(
      now.getTime() + attribution.program.attributionWindowDays * 86_400_000,
    );
    const expiryCandidates = [
      windowExpiry,
      attribution.expiresAt,
      attribution.program.endedAt,
    ].filter((value): value is Date => value instanceof Date);
    const expiresAt = new Date(
      Math.min(...expiryCandidates.map((value) => value.getTime())),
    );

    return {
      code: attribution.code,
      programId: attribution.program.id,
      expiresAt,
    };
  }
}
