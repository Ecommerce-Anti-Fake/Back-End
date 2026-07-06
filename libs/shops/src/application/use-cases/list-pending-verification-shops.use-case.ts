import { Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toPendingVerificationShopResponse } from './shop-verification.mapper';

@Injectable()
export class ListPendingVerificationShopsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(filters?: {
    shopStatus?: 'pending_kyc' | 'pending_document' | 'pending_verification' | 'verified';
    registrationType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'createdAt' | 'shopName';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters?.pageSize && filters.pageSize > 0 ? filters.pageSize : 10;
    const result = await this.shopsRepository.findPendingVerificationShops({ ...filters, page, pageSize });

    return {
      page,
      pageSize,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / pageSize),
      items: result.items.map(toPendingVerificationShopResponse),
    };
  }
}
