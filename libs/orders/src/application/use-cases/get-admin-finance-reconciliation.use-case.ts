import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class GetAdminFinanceReconciliationUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  execute(input?: {
    fromDate?: string;
    toDate?: string;
    shopId?: string;
    orderId?: string;
    paymentStatus?: string;
    escrowStatus?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }) {
    return this.ordersRepository.findAdminFinanceReconciliation(input);
  }
}
