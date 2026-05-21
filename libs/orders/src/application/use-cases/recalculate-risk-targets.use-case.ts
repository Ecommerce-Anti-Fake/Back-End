import { Injectable } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { CalculateRiskScoreUseCase } from './calculate-risk-score.use-case';

@Injectable()
export class RecalculateRiskTargetsUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly calculateRiskScoreUseCase: CalculateRiskScoreUseCase,
  ) {}

  async executeForReport(input: { targetType: string; targetId: string; actorUserId?: string | null }) {
    const targets = await this.ordersRepository.resolveRiskTargetsForReport(input);
    const results: Array<Awaited<ReturnType<CalculateRiskScoreUseCase['execute']>>> = [];
    for (const target of targets) {
      results.push(
        await this.calculateRiskScoreUseCase.execute({
          ...target,
          actorUserId: input.actorUserId ?? null,
        }),
      );
    }
    return results;
  }
}
