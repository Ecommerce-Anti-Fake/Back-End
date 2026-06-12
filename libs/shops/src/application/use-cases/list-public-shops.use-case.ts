import { Injectable } from '@nestjs/common';
import { PublicShopsLookupMessage } from '@contracts';
import { ShopsRepository } from '../../infrastructure/persistence/shops.repository';

@Injectable()
export class ListPublicShopsUseCase {
  constructor(private readonly shopsRepository: ShopsRepository) {}

  execute(input: PublicShopsLookupMessage = {}) {
    return this.shopsRepository.findPublicShopSummaries(input);
  }
}
