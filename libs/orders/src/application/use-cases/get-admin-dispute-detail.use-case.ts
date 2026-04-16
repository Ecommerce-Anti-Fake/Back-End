import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toAdminDisputeDetailResponse } from './admin-disputes.mapper';

@Injectable()
export class GetAdminDisputeDetailUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(disputeId: string) {
    const dispute = await this.ordersRepository.findDisputeById(disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const evidence = await this.ordersRepository.findEvidenceByDisputeId(dispute.id);
    const moderationCase = await this.ordersRepository.findModerationCaseByTarget('DISPUTE', dispute.id);
    const timeline = await this.ordersRepository.findAuditLogsByTarget('DISPUTE', dispute.id);
    return toAdminDisputeDetailResponse(dispute, evidence, moderationCase, timeline);
  }
}
