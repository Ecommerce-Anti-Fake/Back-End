import { Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toBrandAuthorizationResponse } from './shops.mapper';

@Injectable()
export class ListAdminBrandAuthorizationsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(input: { verificationStatus?: 'pending' | 'approved' | 'rejected' }) {
    const authorizations = await this.shopsRepository.findBrandAuthorizationsForAdmin({
      verificationStatus: input.verificationStatus,
    });

    return authorizations.map(toBrandAuthorizationResponse);
  }
}
