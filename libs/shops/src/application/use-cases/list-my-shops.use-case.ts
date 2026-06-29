import { Injectable } from '@nestjs/common';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';
import { toMyShopResponse } from './shops.mapper';

@Injectable()
export class ListMyShopsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  async execute(ownerUserId: string) {
    const shops = await this.shopsRepository.findByOwnerUserId(ownerUserId);
    return shops.map(toMyShopResponse);
  }
}
