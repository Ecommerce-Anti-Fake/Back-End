import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, WalletBalanceType, WalletEntryDirection, WalletTransactionType } from '@prisma/client';
import { WalletRepository } from '@wallet';
import {
  DisputeWithOrder,
  OrderWithRelations,
  OrdersRepository,
} from '../../infrastructure/persistence/orders.repository';
import { OrderInventoryService } from './order-inventory.service';

type WalletRefundOrder = {
  id: string;
  orderStatus: string;
  buyerUserId: string | null;
  buyerPayableAmount: Prisma.Decimal;
  paymentIntent: { id: string; paymentMethod: string; paymentStatus: string } | null;
  escrow: { escrowStatus: string } | null;
};

@Injectable()
export class OrderReversalService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly orderInventoryService: OrderInventoryService,
    private readonly walletRepository: WalletRepository,
  ) {}

  cancelOrder(orderId: string, actorUserId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) throw new BadRequestException('Order not found');

      const walletRefund = this.isHeldWalletPayment(order);
      if (order.orderStatus !== 'pending' && !walletRefund) {
        throw new BadRequestException('Order is not eligible for cancellation');
      }

      await this.orderInventoryService.restoreOrderInventory(tx, order);
      if (walletRefund) await this.refundWalletInTransaction(tx, order);
      await this.ordersRepository.updatePaymentStatusWithAudit(tx, {
        orderId, actorUserId, paymentStatus: walletRefund ? 'REFUNDED' : 'CANCELLED',
      });
      await this.ordersRepository.updateEscrowStatusWithAudit(tx, {
        orderId, actorUserId, escrowStatus: walletRefund ? 'REFUNDED' : 'CANCELLED',
        note: walletRefund ? 'Escrow refunded because wallet order was cancelled' : 'Escrow cancelled because order was cancelled',
      });
      await this.ordersRepository.cancelPendingAffiliateArtifacts(tx, orderId);
      return this.ordersRepository.updateOrderStatus(tx, orderId, 'cancelled');
    });
  }

  cancelOrderShopGroup(orderId: string, groupId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) throw new BadRequestException('Order not found');
      const groupItems = order.items.filter((item) => item.orderShopGroupId === groupId);
      await this.orderInventoryService.restoreOrderInventory(tx, { items: groupItems });
      return this.ordersRepository.cancelShopGroupFulfillment(tx, { orderId, groupId });
    });
  }

  refundPaidOrder(orderId: string, actorUserId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) throw new BadRequestException('Order not found');
      await this.orderInventoryService.restoreOrderInventory(tx, order);
      if (this.isHeldWalletPayment(order)) await this.refundWalletInTransaction(tx, order);
      await this.ordersRepository.updatePaymentStatusWithAudit(tx, { orderId, actorUserId, paymentStatus: 'REFUNDED' });
      await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId, actorUserId, escrowStatus: 'REFUNDED', note: 'Escrow refunded because order was refunded' });
      await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, orderId);
      return this.ordersRepository.updateOrderStatus(tx, orderId, 'refunded');
    });
  }

  private isHeldWalletPayment(order: WalletRefundOrder) {
    return order.orderStatus === 'paid' && order.paymentIntent?.paymentMethod === 'WALLET' &&
      order.paymentIntent.paymentStatus === 'PAID' && order.escrow?.escrowStatus === 'HELD';
  }

  private async refundWalletInTransaction(tx: Prisma.TransactionClient, order: WalletRefundOrder) {
    if (!order.buyerUserId || !order.paymentIntent) throw new BadRequestException('Wallet refund requires a user buyer');
    const userWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(tx, order.buyerUserId, 'VND');
    const escrowWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(tx, 'PLATFORM_ESCROW_VND', 'VND');
    return this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `REFUND:${order.id}`,
      transactionType: WalletTransactionType.REFUND,
      idempotencyKey: `ORDER:${order.id}:WALLET_REFUND`,
      amount: order.buyerPayableAmount,
      currency: 'VND', referenceType: 'ORDER', referenceId: order.id,
      orderId: order.id, paymentIntentId: order.paymentIntent.id,
      description: 'Refund wallet payment to buyer',
      entries: [
        { walletId: escrowWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.PENDING, amount: order.buyerPayableAmount },
        { walletId: userWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: order.buyerPayableAmount },
      ],
    });
  }

  resolveDispute(input: { disputeId: string; actorUserId: string; resolution: 'RESOLVED' | 'REFUNDED' }): Promise<DisputeWithOrder> {
    return this.ordersRepository.withTransaction(async (tx) => {
      const dispute = await this.ordersRepository.findDisputeForResolution(tx, input.disputeId);
      if (!dispute) throw new BadRequestException('Dispute not found');
      if (input.resolution === 'REFUNDED' && dispute.order.orderStatus === 'paid') {
        await this.orderInventoryService.restoreOrderInventory(tx, dispute.order);
        await this.ordersRepository.updatePaymentStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, paymentStatus: 'REFUNDED' });
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, escrowStatus: 'REFUNDED', note: 'Escrow refunded by dispute resolution' });
        await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, dispute.orderId);
        await this.ordersRepository.updateOrderStatus(tx, dispute.orderId, 'refunded');
      } else if (input.resolution === 'RESOLVED' && dispute.order.orderStatus === 'completed') {
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, escrowStatus: 'RELEASED', note: 'Escrow released after dispute was resolved without refund' });
      } else if (input.resolution === 'RESOLVED' && dispute.order.orderStatus === 'paid') {
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, escrowStatus: 'HELD', note: 'Escrow returned to hold after dispute was resolved without refund' });
      }
      return this.ordersRepository.updateDisputeStatus(tx, input.disputeId, input.resolution);
    });
  }
}
