import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toAdminDisputeDetailResponse } from './admin-disputes.mapper';

@Injectable()
export class ResolveAdminDisputeUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: {
    disputeId: string;
    requesterUserId: string;
    resolution: 'RESOLVED' | 'REFUNDED';
    internalNote?: string | null;
  }) {
    const dispute = await this.ordersRepository.findDisputeById(input.disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.disputeStatus !== 'OPEN') {
      throw new BadRequestException('Only open disputes can be resolved');
    }

    if (input.resolution === 'REFUNDED' && dispute.order.orderStatus !== 'paid') {
      throw new BadRequestException('Only paid orders can be refunded through admin dispute resolution');
    }

    const resolved = await this.ordersRepository.resolveDispute({
      disputeId: dispute.id,
      resolution: input.resolution,
    });

    const moderationCase = await this.ordersRepository.upsertDisputeModerationCase({
      disputeId: dispute.id,
      assignedAdminUserId: input.requesterUserId,
      caseStatus: 'RESOLVED',
      internalNote: input.internalNote?.trim() || null,
      reason: dispute.reason,
      resolvedAt: new Date(),
    });

    const evidence = await this.ordersRepository.findEvidenceByDisputeId(dispute.id);
    await this.ordersRepository.createAuditLog({
      targetType: 'DISPUTE',
      targetId: dispute.id,
      actorUserId: input.requesterUserId,
      action: 'DISPUTE_RESOLVED_BY_ADMIN',
      fromStatus: dispute.disputeStatus,
      toStatus: resolved.disputeStatus,
      note: input.internalNote?.trim() || null,
      metadata: {
        resolution: input.resolution,
      },
    });
    const timeline = await this.ordersRepository.findAuditLogsByTarget('DISPUTE', dispute.id);
    return toAdminDisputeDetailResponse(resolved, evidence, moderationCase, timeline);
  }
}
