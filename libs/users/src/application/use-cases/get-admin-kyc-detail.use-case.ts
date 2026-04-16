import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toAdminKycDetailResponse } from './users-kyc.mapper';

@Injectable()
export class GetAdminKycDetailUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    const kyc = await this.usersRepository.findUserKycWithHistoryByUserId(userId);
    if (!kyc) {
      throw new NotFoundException('User KYC not found');
    }

    const timeline = await this.usersRepository.findAuditLogsByTarget('USER_KYC', kyc.id);
    return toAdminKycDetailResponse(kyc, timeline);
  }
}
