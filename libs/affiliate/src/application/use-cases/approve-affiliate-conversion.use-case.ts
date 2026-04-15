import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateConversionResponse } from './affiliate.mapper';

@Injectable()
export class ApproveAffiliateConversionUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { requesterUserId: string; conversionId: string }) {
    const conversion = await this.repository.findOwnedConversionById(input.conversionId, input.requesterUserId);
    if (!conversion) {
      throw new NotFoundException('Affiliate conversion not found or not owned by current user');
    }

    if (conversion.conversionStatus !== 'PENDING') {
      throw new BadRequestException('Only pending conversions can be approved');
    }

    const approved = await this.repository.approveConversion(input.conversionId);
    return toAffiliateConversionResponse(approved);
  }
}
