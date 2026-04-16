import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { toDisputeEvidenceResponse } from './dispute-evidence.mapper';

@Injectable()
export class ListDisputeEvidenceUseCase {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async execute(input: { disputeId: string; requesterUserId: string }) {
    const dispute = await this.ordersRepository.findDisputeById(input.disputeId);
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const isRetailBuyer = dispute.order.buyerUserId === input.requesterUserId;
    const isWholesaleBuyerOwner = dispute.order.buyerShop?.ownerUserId === input.requesterUserId;
    const isSellerOwner = dispute.order.shop.ownerUserId === input.requesterUserId;

    if (!isRetailBuyer && !isWholesaleBuyerOwner && !isSellerOwner) {
      throw new ForbiddenException('You do not have permission to view evidence for this dispute');
    }

    const evidence = await this.ordersRepository.findEvidenceByDisputeId(dispute.id);
    return evidence.map(toDisputeEvidenceResponse);
  }
}
