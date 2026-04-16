import { Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toAdminDisputeDetailResponse } from './admin-disputes.mapper';

@Injectable()
export class UpdateAdminDisputeCaseUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: {
    disputeId: string;
    requesterUserId: string;
    caseStatus: 'ASSIGNED' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
    internalNote?: string | null;
  }) {
    const dispute = await this.ordersRepository.findDisputeById(input.disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const existingCase = await this.ordersRepository.findModerationCaseByTarget('DISPUTE', dispute.id);

    const moderationCase = await this.ordersRepository.upsertDisputeModerationCase({
      disputeId: dispute.id,
      assignedAdminUserId: input.requesterUserId,
      caseStatus: input.caseStatus,
      internalNote: input.internalNote?.trim() || null,
      reason: dispute.reason,
      resolvedAt: input.caseStatus === 'RESOLVED' || input.caseStatus === 'CLOSED' ? new Date() : null,
    });

    const evidence = await this.ordersRepository.findEvidenceByDisputeId(dispute.id);
    await this.ordersRepository.createAuditLog({
      targetType: 'DISPUTE',
      targetId: dispute.id,
      actorUserId: input.requesterUserId,
      action: 'DISPUTE_CASE_UPDATED',
      fromStatus: existingCase?.caseStatus ?? null,
      toStatus: input.caseStatus,
      note: input.internalNote?.trim() || null,
    });
    const timeline = await this.ordersRepository.findAuditLogsByTarget('DISPUTE', dispute.id);
    return toAdminDisputeDetailResponse(dispute, evidence, moderationCase, timeline);
  }
}
