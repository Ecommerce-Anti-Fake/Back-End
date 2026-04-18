import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class GetAdminDisputeSummaryUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute() {
    const counts = await this.ordersRepository.countDisputesByStatusAndCaseStatus();

    return {
      total: Object.values(counts.byDisputeStatus).reduce((sum, count) => sum + count, 0),
      byDisputeStatus: {
        OPEN: counts.byDisputeStatus.OPEN ?? 0,
        RESOLVED: counts.byDisputeStatus.RESOLVED ?? 0,
        REFUNDED: counts.byDisputeStatus.REFUNDED ?? 0,
      },
      byCaseStatus: {
        ASSIGNED: counts.byCaseStatus.ASSIGNED ?? 0,
        IN_REVIEW: counts.byCaseStatus.IN_REVIEW ?? 0,
        ESCALATED: counts.byCaseStatus.ESCALATED ?? 0,
        RESOLVED: counts.byCaseStatus.RESOLVED ?? 0,
        CLOSED: counts.byCaseStatus.CLOSED ?? 0,
      },
    };
  }
}
