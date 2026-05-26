import { Injectable } from '@nestjs/common';
import { ProductRepository } from '../../infrastructure/persistence/product-repository';
import { toShippingCarrierResponse } from './products.mapper';

@Injectable()
export class ListShippingCarriersUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute() {
    const carriers = await this.productRepository.findActiveShippingCarriers();
    return carriers.map(toShippingCarrierResponse);
  }
}
