import { Injectable } from '@nestjs/common';
import { ListOffersMessage } from '@contracts';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toOfferResponse } from './products.mapper';

@Injectable()
export class ListOffersUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

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

function isPaginatedResult(value: unknown): value is { total: number; page: number; pageSize: number; items: unknown[] } {
  return Boolean(value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items));
}
