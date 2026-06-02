import { Injectable } from '@nestjs/common';
import type { AdminReportsLookupMessage } from '@contracts';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toReportResponse } from './reports.mapper';

@Injectable()
export class ListAdminReportsUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input?: AdminReportsLookupMessage) {
    const result = await this.ordersRepository.findReportsForAdmin(input);
    return {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      items: result.items.map((report) => toReportResponse(report)),
    };
  }
}
