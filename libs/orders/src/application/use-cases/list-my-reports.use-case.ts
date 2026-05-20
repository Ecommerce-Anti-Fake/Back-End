import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toReportResponse } from './reports.mapper';

@Injectable()
export class ListMyReportsUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { requesterUserId: string }) {
    const reports = await this.ordersRepository.findReportsForUser(input.requesterUserId);
    return {
      items: reports.map((report) => toReportResponse(report)),
    };
  }
}
