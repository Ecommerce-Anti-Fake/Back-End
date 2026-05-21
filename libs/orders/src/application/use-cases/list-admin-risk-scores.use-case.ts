import { Injectable } from '@nestjs/common';
import { OrdersRepository, RiskTargetType } from '../../infrastructure/persistence/orders.repository';
import { toRiskScoreResponse } from './risk-score.mapper';

@Injectable()
export class ListAdminRiskScoresUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input?: {
    targetType?: RiskTargetType;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    search?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }) {
    const result = await this.ordersRepository.findRiskScoresForAdmin(input);
    return {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      items: result.items.map((score) => toRiskScoreResponse(score)),
    };
  }
}
