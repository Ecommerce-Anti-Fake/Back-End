import { Injectable } from '@nestjs/common';
import { AffiliateRepository } from '../../infrastructure/persistence/affiliate.repository';
import { toAffiliateProgramResponse } from './affiliate.mapper';

@Injectable()
export class ListActiveAffiliateProgramsUseCase {
  constructor(private readonly repository: AffiliateRepository) {}

  async execute(input: { page: number; pageSize: number }) {
    const now = new Date();
    const skip = (input.page - 1) * input.pageSize;
    const [programs, total] = await Promise.all([
      this.repository.findActivePrograms(now, skip, input.pageSize),
      this.repository.countActivePrograms(now),
    ]);
    return {
      items: programs.map(toAffiliateProgramResponse),
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }
}
