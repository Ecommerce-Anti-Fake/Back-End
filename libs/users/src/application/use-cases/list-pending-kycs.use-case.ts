import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../../infrastructure/persistence/users.repository';
import { toAdminPendingKycItemResponse } from './users-kyc.mapper';

@Injectable()
export class ListPendingKycsUseCase {
  constructor(private readonly usersRepository: UsersRepository) {}

  async execute(input?: {
    verificationStatus?: 'pending' | 'approved' | 'rejected';
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'id' | 'fullName' | 'verifiedAt';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = input?.page && input.page > 0 ? input.page : 1;
    const pageSize = input?.pageSize && input.pageSize > 0 ? input.pageSize : 20;
    const result = await this.usersRepository.findPendingKycs({ ...input, page, pageSize });

    return {
      page,
      pageSize,
      total: result.total,
      items: result.items.map(toAdminPendingKycItemResponse),
    };
  }
}
