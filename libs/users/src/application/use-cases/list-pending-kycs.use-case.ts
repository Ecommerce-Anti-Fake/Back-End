import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toAdminPendingKycItemResponse } from './users-kyc.mapper';

@Injectable()
export class ListPendingKycsUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(verificationStatus: 'pending' = 'pending') {
    const kycs = await this.usersRepository.findPendingKycs(verificationStatus);
    return kycs.map(toAdminPendingKycItemResponse);
  }
}
