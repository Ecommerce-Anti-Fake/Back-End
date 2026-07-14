import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { RecalculateRiskTargetsUseCase } from './recalculate-risk-targets.use-case';
import { OrderReversalService } from '../services';

@Injectable()
export class OpenOrderDisputeUseCase {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly recalculateRiskTargetsUseCase: RecalculateRiskTargetsUseCase,
    private readonly orderReversalService: OrderReversalService,
  ) {}

  async execute(input: { id: string; requesterUserId: string; reason: string }) {
    const order = await this.ordersRepository.findOrderById(input.id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isRetailBuyer = order.buyerUserId === input.requesterUserId;
    const isWholesaleBuyerOwner = order.buyerShop?.ownerUserId === input.requesterUserId;
    const isSellerOwner = order.shop.ownerUserId === input.requesterUserId;

    if (!isRetailBuyer && !isWholesaleBuyerOwner && !isSellerOwner) {
      throw new ForbiddenException('You do not have permission to open a dispute for this order');
    }

    if (!['paid', 'completed'].includes(order.orderStatus)) {
      throw new BadRequestException('Only paid or completed orders can be disputed');
    }

    const reason = input.reason.trim();
    if (!reason) {
      throw new BadRequestException('Dispute reason is required');
    }

    const existingOpenDispute = await this.ordersRepository.findOpenDisputeByOrder(order.id);
    if (existingOpenDispute) {
      throw new BadRequestException('Order already has an open dispute');
    }

    const dispute = await this.orderReversalService.openDispute({
      orderId: order.id,
      openedByUserId: input.requesterUserId,
      reason,
    });

    await this.recalculateRiskTargetsUseCase.executeForReport({
      targetType: 'ORDER',
      targetId: order.id,
      actorUserId: input.requesterUserId,
    });

    return dispute;
  }
}
