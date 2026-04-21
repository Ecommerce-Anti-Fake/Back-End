import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DisputeWithOrder,
  OrderWithRelations,
  OrdersRepository,
} from '../../infrastructure/persistence/orders.repository';
import { OrderInventoryService } from './order-inventory.service';

@Injectable()
export class OrderReversalService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderInventoryService: OrderInventoryService,
  ) {}

  cancelOrder(orderId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      await this.orderInventoryService.restoreOrderInventory(tx, order);
      await this.ordersRepository.updatePaymentStatus(tx, orderId, 'CANCELLED');
      await this.ordersRepository.updateEscrowStatus(tx, orderId, 'CANCELLED');
      await this.ordersRepository.cancelPendingAffiliateArtifacts(tx, orderId);

      return this.ordersRepository.updateOrderStatus(tx, orderId, 'cancelled');
    });
  }

  refundPaidOrder(orderId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      await this.orderInventoryService.restoreOrderInventory(tx, order);
      await this.ordersRepository.updatePaymentStatus(tx, orderId, 'REFUNDED');
      await this.ordersRepository.updateEscrowStatus(tx, orderId, 'REFUNDED');
      await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, orderId);

      return this.ordersRepository.updateOrderStatus(tx, orderId, 'refunded');
    });
  }

  resolveDispute(input: {
    disputeId: string;
    resolution: 'RESOLVED' | 'REFUNDED';
  }): Promise<DisputeWithOrder> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const dispute = await this.ordersRepository.findDisputeForResolution(tx, input.disputeId);
      if (!dispute) {
        throw new BadRequestException('Dispute not found');
      }

      if (input.resolution === 'REFUNDED' && dispute.order.orderStatus === 'paid') {
        await this.orderInventoryService.restoreOrderInventory(tx, dispute.order);
        await this.ordersRepository.updatePaymentStatus(tx, dispute.orderId, 'REFUNDED');
        await this.ordersRepository.updateEscrowStatus(tx, dispute.orderId, 'REFUNDED');
        await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, dispute.orderId);
        await this.ordersRepository.updateOrderStatus(tx, dispute.orderId, 'refunded');
      }

      return this.ordersRepository.updateDisputeStatus(tx, input.disputeId, input.resolution);
    });
  }
}
