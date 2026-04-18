import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toAdminOpenDisputeResponse } from './admin-disputes.mapper';

@Injectable()
export class ListAdminOpenDisputesUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(filters?: {
    disputeStatus?: 'OPEN' | 'RESOLVED' | 'REFUNDED';
    assignedAdminUserId?: string;
    reason?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: 'openedAt' | 'orderId' | 'disputeStatus';
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters?.pageSize && filters.pageSize > 0 ? filters.pageSize : 20;
    const result = await this.ordersRepository.findOpenDisputesForAdmin({ ...filters, page, pageSize });

    return {
      page,
      pageSize,
      total: result.total,
      items: result.items.map(toAdminOpenDisputeResponse),
    };
  }
}
