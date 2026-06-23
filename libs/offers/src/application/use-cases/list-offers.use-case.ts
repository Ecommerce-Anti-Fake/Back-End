import { Injectable } from '@nestjs/common';
import { ListOffersMessage } from '@contracts';
import { OffersRepository } from '../../infrastructure/persistence/offers.repository';
import { toOfferResponse } from './offers.mapper';

@Injectable()
export class ListOffersUseCase {
  constructor(private readonly productRepository: OffersRepository) {}

  async execute(input: ListOffersMessage = {}) {
    const result = await this.productRepository.findAllOffers(input);
    if (isPaginatedResult(result)) {
      return {
        ...result,
        items: result.items.map(toOfferResponse),
      };
    }

    return result.map(toOfferResponse);
  }
}

function isPaginatedResult(
  value: unknown,
): value is {
  total: number;
  page: number;
  pageSize: number;
  items: unknown[];
} {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { items?: unknown }).items),
  );
}
