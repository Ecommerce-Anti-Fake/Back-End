import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

@Injectable()
export class ResolveOrderDisputeUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: {
    disputeId: string;
    requesterUserId: string;
    resolution: 'RESOLVED' | 'REFUNDED';
  }) {
    const dispute = await this.ordersRepository.findDisputeById(input.disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.order.shop.ownerUserId !== input.requesterUserId) {
      throw new ForbiddenException('Only the seller can resolve the dispute');
    }

    if (dispute.disputeStatus !== 'OPEN') {
      throw new BadRequestException('Only open disputes can be resolved');
    }

    if (input.resolution === 'REFUNDED' && dispute.order.orderStatus !== 'paid') {
      throw new BadRequestException('Only paid orders can be refunded through dispute resolution');
    }

    const resolved = await this.ordersRepository.resolveDispute({
      disputeId: dispute.id,
      resolution: input.resolution,
    });

    await this.ordersRepository.createAuditLog({
      targetType: 'DISPUTE',
      targetId: dispute.id,
      actorUserId: input.requesterUserId,
      action: 'DISPUTE_RESOLVED_BY_SELLER',
      fromStatus: dispute.disputeStatus,
      toStatus: resolved.disputeStatus,
      metadata: {
        resolution: input.resolution,
      },
    });

    return resolved;
  }
}
