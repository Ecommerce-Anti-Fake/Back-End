import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';

@Injectable()
export class GetAdminKycSummaryUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute() {
    const byVerificationStatus = await this.usersRepository.countKycsByVerificationStatus();

    return {
      total: Object.values(byVerificationStatus).reduce((sum, count) => sum + count, 0),
      byVerificationStatus: {
        pending: byVerificationStatus.pending ?? 0,
        approved: byVerificationStatus.approved ?? 0,
        rejected: byVerificationStatus.rejected ?? 0,
      },
    };
  }
}
