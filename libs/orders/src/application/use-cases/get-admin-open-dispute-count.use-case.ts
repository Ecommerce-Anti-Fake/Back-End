import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class GetAdminOpenDisputeCountUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute() {
    const count = await this.ordersRepository.countOpenDisputes();
    return {
      openDisputes: count,
    };
  }
}
