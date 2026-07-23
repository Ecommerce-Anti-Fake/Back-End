import { Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateProgramResponse } from './affiliate.mapper';

type SellerProgramStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

@Injectable()
export class ListSellerAffiliateProgramsUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: {
    requesterUserId: string;
    page: number;
    pageSize: number;
    status?: SellerProgramStatus;
    search?: string;
  }) {
    const search = input.search?.trim() || undefined;
    const query = {
      requesterUserId: input.requesterUserId,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      status: input.status,
      search,
    };
    const [programs, total] = await Promise.all([
      this.repository.findSellerPrograms(query),
      this.repository.countSellerPrograms(query),
    ]);

    return {
      items: programs.map((program) => ({
        ...toAffiliateProgramResponse(program),
        memberCount: program._count.accounts,
        conversionCount: program._count.conversions,
        configurationLocked:
          program._count.accounts > 0 || program._count.conversions > 0,
      })),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
