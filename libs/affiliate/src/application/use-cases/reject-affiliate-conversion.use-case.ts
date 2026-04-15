import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateConversionResponse } from './affiliate.mapper';

@Injectable()
export class RejectAffiliateConversionUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; conversionId: string }) {
    const conversion = await this.repository.findOwnedConversionById(input.conversionId, input.requesterUserId);
    if (!conversion) {
      throw new NotFoundException('Affiliate conversion not found or not owned by current user');
    }

    if (conversion.conversionStatus !== 'PENDING') {
      throw new BadRequestException('Only pending conversions can be rejected');
    }

    const rejected = await this.repository.rejectConversion(input.conversionId);
    return toAffiliateConversionResponse(rejected);
  }
}
