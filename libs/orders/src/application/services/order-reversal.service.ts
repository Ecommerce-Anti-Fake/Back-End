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

  cancelOrder(orderId: string, actorUserId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      await this.orderInventoryService.restoreOrderInventory(tx, order);
      await this.ordersRepository.updatePaymentStatusWithAudit(tx, {
        orderId,
        actorUserId,
        paymentStatus: 'CANCELLED',
      });
      await this.ordersRepository.updateEscrowStatusWithAudit(tx, {
        orderId,
        actorUserId,
        escrowStatus: 'CANCELLED',
        note: 'Escrow cancelled because order was cancelled',
      });
      await this.ordersRepository.cancelPendingAffiliateArtifacts(tx, orderId);

      return this.ordersRepository.updateOrderStatus(tx, orderId, 'cancelled');
    });
  }

  cancelOrderShopGroup(orderId: string, groupId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      const groupItems = order.items.filter((item) => item.orderShopGroupId === groupId);
      await this.orderInventoryService.restoreOrderInventory(tx, { items: groupItems });

      return this.ordersRepository.cancelShopGroupFulfillment(tx, {
        orderId,
        groupId,
      });
    });
  }

  refundPaidOrder(orderId: string, actorUserId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) {
        throw new BadRequestException('Order not found');
      }

      await this.orderInventoryService.restoreOrderInventory(tx, order);
      await this.ordersRepository.updatePaymentStatusWithAudit(tx, {
        orderId,
        actorUserId,
        paymentStatus: 'REFUNDED',
      });
      await this.ordersRepository.updateEscrowStatusWithAudit(tx, {
        orderId,
        actorUserId,
        escrowStatus: 'REFUNDED',
        note: 'Escrow refunded because order was refunded',
      });
      await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, orderId);

      return this.ordersRepository.updateOrderStatus(tx, orderId, 'refunded');
    });
  }

  resolveDispute(input: {
    disputeId: string;
    actorUserId: string;
    resolution: 'RESOLVED' | 'REFUNDED';
  }): Promise<DisputeWithOrder> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const dispute = await this.ordersRepository.findDisputeForResolution(tx, input.disputeId);
      if (!dispute) {
        throw new BadRequestException('Dispute not found');
      }

      if (input.resolution === 'REFUNDED' && dispute.order.orderStatus === 'paid') {
        await this.orderInventoryService.restoreOrderInventory(tx, dispute.order);
        await this.ordersRepository.updatePaymentStatusWithAudit(tx, {
          orderId: dispute.orderId,
          actorUserId: input.actorUserId,
          paymentStatus: 'REFUNDED',
        });
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, {
          orderId: dispute.orderId,
          actorUserId: input.actorUserId,
          escrowStatus: 'REFUNDED',
          note: 'Escrow refunded by dispute resolution',
        });
        await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, dispute.orderId);
        await this.ordersRepository.updateOrderStatus(tx, dispute.orderId, 'refunded');
      } else if (input.resolution === 'RESOLVED' && dispute.order.orderStatus === 'completed') {
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, {
          orderId: dispute.orderId,
          actorUserId: input.actorUserId,
          escrowStatus: 'RELEASED',
          note: 'Escrow released after dispute was resolved without refund',
        });
      } else if (input.resolution === 'RESOLVED' && dispute.order.orderStatus === 'paid') {
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, {
          orderId: dispute.orderId,
          actorUserId: input.actorUserId,
          escrowStatus: 'HELD',
          note: 'Escrow returned to hold after dispute was resolved without refund',
        });
      }

      return this.ordersRepository.updateDisputeStatus(tx, input.disputeId, input.resolution);
    });
  }
}
