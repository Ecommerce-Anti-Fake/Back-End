import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toUserKycResponse } from './users-kyc.mapper';

@Injectable()
export class GetCurrentUserKycUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(userId: string) {
    const kyc = await this.usersRepository.findUserKycByUserId(userId);
    return kyc ? toUserKycResponse(kyc) : null;
  }
}
