import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toAdminOpenDisputeResponse } from './admin-disputes.mapper';

@Injectable()
export class ListAdminOpenDisputesUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute() {
    const disputes = await this.ordersRepository.findOpenDisputesForAdmin();
    return disputes.map(toAdminOpenDisputeResponse);
  }
}
