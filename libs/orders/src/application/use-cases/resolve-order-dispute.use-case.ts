import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { OrderReversalService } from '../services';

@Injectable()
export class ResolveOrderDisputeUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderReversalService: OrderReversalService,
  ) {}

  async execute(input: {
    disputeId: string;
    requesterUserId: string;
    resolution: 'RESOLVED' | 'REFUNDED';
  }) {
    const dispute = await this.ordersRepository.findDisputeById(input.disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const sellerCanResolve = dispute.order.shopGroups?.length
      ? dispute.order.shopGroups.length === 1 &&
        dispute.order.shopGroups[0].shop.ownerUserId === input.requesterUserId
      : dispute.order.shop.ownerUserId === input.requesterUserId;
    if (!sellerCanResolve) {
      throw new ForbiddenException('Only the seller can resolve the dispute');
    }

    if (dispute.disputeStatus !== 'OPEN') {
      throw new BadRequestException('Only open disputes can be resolved');
    }

    if (
      input.resolution === 'REFUNDED' &&
      !['paid', 'partially_refunded', 'completed'].includes(dispute.order.orderStatus)
    ) {
      throw new BadRequestException('Only paid or completed orders can be refunded through dispute resolution');
    }

    const resolved = await this.orderReversalService.resolveDispute({
      disputeId: dispute.id,
      actorUserId: input.requesterUserId,
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
