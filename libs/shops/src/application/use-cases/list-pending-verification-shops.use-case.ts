import { Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toPendingVerificationShopResponse } from './shop-verification.mapper';

@Injectable()
export class ListPendingVerificationShopsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute() {
    const shops = await this.shopsRepository.findPendingVerificationShops();
    return shops.map(toPendingVerificationShopResponse);
  }
}
