import { Injectable } from '@nestjs/common';
import { AdminModerationCasesLookupMessage } from '@contracts';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toModerationCaseResponse } from './moderation-case.mapper';

@Injectable()
export class ListAdminModerationCasesUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: AdminModerationCasesLookupMessage = {}) {
    const result = await this.ordersRepository.findModerationCasesForAdmin(input);

    return {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      items: result.items.map((caseRecord) => toModerationCaseResponse(caseRecord)),
    };
  }
}
