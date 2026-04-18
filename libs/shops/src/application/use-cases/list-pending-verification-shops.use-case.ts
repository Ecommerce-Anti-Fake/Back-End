import { Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toPendingVerificationShopResponse } from './shop-verification.mapper';

@Injectable()
export class ListPendingVerificationShopsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(filters?: {
    shopStatus?: 'pending_kyc' | 'pending_verification' | 'active';
    registrationType?: 'NORMAL' | 'HANDMADE' | 'MANUFACTURER' | 'DISTRIBUTOR';
    categoryId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'createdAt' | 'shopName';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters?.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const result = await this.shopsRepository.findPendingVerificationShops({ ...filters, page, pageSize });

    return {
      page,
      pageSize,
      total: result.total,
      items: result.items.map(toPendingVerificationShopResponse),
    };
  }
}
