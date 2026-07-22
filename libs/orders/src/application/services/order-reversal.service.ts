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

  openDispute(input: { orderId: string; openedByUserId: string; reason: string }): Promise<any> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, input.orderId);
      if (!order) throw new BadRequestException('Order not found');
      const existing = await tx.dispute.findFirst({ where: { orderId: input.orderId, disputeStatus: 'OPEN' } });
      if (existing) throw new BadRequestException('Order already has an open dispute');
      const dispute = await tx.dispute.create({ data: { orderId: input.orderId, openedByUserId: input.openedByUserId, reason: input.reason, disputeStatus: 'OPEN' } });
      const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(tx, order.shopId, 'VND');
      const available = new Prisma.Decimal(shopWallet.availableBalance);
      const pending = new Prisma.Decimal(shopWallet.pendingBalance);
      const requested = new Prisma.Decimal(order.buyerPayableAmount);
      const amount = Prisma.Decimal.min(requested, available.plus(pending));
      const availablePart = Prisma.Decimal.min(amount, available);
      const pendingPart = amount.minus(availablePart);
      if (amount.gt(0)) {
        await this.walletRepository.executeTransactionInTransaction(tx, {
          transactionCode: `DISPUTE_HOLD:${dispute.id}`,
          transactionType: WalletTransactionType.DISPUTE_HOLD,
          idempotencyKey: `DISPUTE:${dispute.id}:HOLD`, amount,
          referenceType: 'DISPUTE', referenceId: dispute.id,
          entries: [
            ...(availablePart.gt(0) ? [{ walletId: shopWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount: availablePart }] : []),
            ...(pendingPart.gt(0) ? [{ walletId: shopWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.PENDING, amount: pendingPart }] : []),
            { walletId: shopWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.LOCKED, amount },
          ],
        });
      }
      await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: input.orderId, actorUserId: input.openedByUserId, escrowStatus: 'FROZEN', note: 'Escrow frozen because a dispute was opened' });
      await tx.auditLog.create({ data: { targetType: 'DISPUTE', targetId: dispute.id, actorUserId: input.openedByUserId, action: 'DISPUTE_OPENED', toStatus: 'OPEN', note: input.reason, metadata: { orderId: input.orderId, requestedAmount: requested.toFixed(2), lockedAmount: amount.toFixed(2), shortfallAmount: requested.minus(amount).toFixed(2) } } });
      return dispute;
    });
  }

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
      if (!walletRefund) {
        await (tx as Prisma.TransactionClient & { voucherRedemption?: Prisma.TransactionClient['voucherRedemption'] }).voucherRedemption?.updateMany({
          where: { orderId, status: 'RESERVED' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
      }
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

  partialRefundPaidOrder(
    orderId: string,
    actorUserId: string,
    requestedItems: Array<{ orderItemId: string; quantity: number }>,
  ): Promise<OrderWithRelations> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) throw new BadRequestException('Order not found');
      if (!this.isHeldWalletPayment(order)) {
        throw new BadRequestException('Partial refund currently requires a wallet payment with held escrow');
      }
      const priorRefunds = await tx.auditLog.findMany({
        where: { targetType: 'ORDER', targetId: orderId, action: 'PARTIAL_REFUND' },
        select: { metadata: true },
      });
      const refundedQuantities = new Map<string, number>();
      for (const record of priorRefunds) {
        const metadata = record.metadata as { items?: Array<{ orderItemId: string; quantity: number }> } | null;
        for (const item of metadata?.items ?? []) {
          refundedQuantities.set(item.orderItemId, (refundedQuantities.get(item.orderItemId) ?? 0) + item.quantity);
        }
      }
      const selected = requestedItems.map((requested) => {
        if (!Number.isInteger(requested.quantity) || requested.quantity < 1) {
          throw new BadRequestException('Refund quantity must be greater than zero');
        }
        const item = order.items.find((candidate) => candidate.id === requested.orderItemId);
        if (!item) throw new BadRequestException('Order item does not belong to this order');
        const remaining = item.quantity - (refundedQuantities.get(item.id) ?? 0);
        if (requested.quantity > remaining) throw new BadRequestException('Refund quantity exceeds remaining order quantity');
        return { item, quantity: requested.quantity };
      });
      if (!selected.length) throw new BadRequestException('At least one order item is required');

      const allocationByGroup = new Map<string, typeof order.voucherAllocations>();
      for (const allocation of order.voucherAllocations) {
        const entries = allocationByGroup.get(allocation.orderShopGroupId) ?? [];
        entries.push(allocation);
        allocationByGroup.set(allocation.orderShopGroupId, entries);
      }
      const refundItems = selected.map(({ item, quantity }) => {
        const itemGross = new Prisma.Decimal(item.unitPrice).mul(quantity);
        const groupItems = order.items.filter((candidate) => candidate.orderShopGroupId === item.orderShopGroupId);
        const groupGross = groupItems.reduce((sum, candidate) => sum.plus(new Prisma.Decimal(candidate.unitPrice).mul(candidate.quantity)), new Prisma.Decimal(0));
        const ratio = groupGross.gt(0) ? itemGross.div(groupGross) : new Prisma.Decimal(0);
        const allocations = allocationByGroup.get(item.orderShopGroupId ?? '') ?? [];
        const shopDiscount = allocations.filter((allocation) => allocation.fundingSource === 'SHOP').reduce((sum, allocation) => sum.plus(new Prisma.Decimal(allocation.productDiscountAmount).mul(ratio)), new Prisma.Decimal(0));
        const systemDiscount = allocations.filter((allocation) => allocation.fundingSource === 'SYSTEM').reduce((sum, allocation) => sum.plus(new Prisma.Decimal(allocation.productDiscountAmount).mul(ratio)), new Prisma.Decimal(0));
        const buyerRefund = Prisma.Decimal.max(new Prisma.Decimal(0), itemGross.minus(shopDiscount).minus(systemDiscount)).toDecimalPlaces(2);
        return {
          orderItemId: item.id,
          quantity,
          grossAmount: itemGross.toFixed(2),
          shopVoucherDiscountAmount: shopDiscount.toDecimalPlaces(2).toFixed(2),
          systemVoucherDiscountAmount: systemDiscount.toDecimalPlaces(2).toFixed(2),
          buyerRefundAmount: buyerRefund.toFixed(2),
        };
      });
      const refundAmount = refundItems.reduce((sum, item) => sum.plus(item.buyerRefundAmount), new Prisma.Decimal(0)).toDecimalPlaces(2);
      if (refundAmount.lte(0)) throw new BadRequestException('Refund amount must be greater than zero');
      await this.orderInventoryService.restoreOrderInventory(tx, { items: selected.map(({ item, quantity }) => ({ ...item, quantity })) });
      const userWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(tx, order.buyerUserId!, 'VND');
      const escrowWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(tx, 'PLATFORM_ESCROW_VND', 'VND');
      await this.walletRepository.executeTransactionInTransaction(tx, {
        transactionCode: `PARTIAL_REFUND:${order.id}:${Date.now()}`,
        transactionType: WalletTransactionType.REFUND,
        idempotencyKey: `ORDER:${order.id}:PARTIAL_REFUND:${refundItems.map((item) => `${item.orderItemId}:${item.quantity}`).join(',')}`,
        amount: refundAmount,
        currency: 'VND', referenceType: 'ORDER', referenceId: order.id,
        orderId: order.id, paymentIntentId: order.paymentIntent!.id,
        description: 'Partial refund to buyer with voucher allocation reversal',
        entries: [
          { walletId: escrowWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.PENDING, amount: refundAmount },
          { walletId: userWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: refundAmount },
        ],
      });
      await tx.escrow.update({ where: { orderId }, data: { heldAmount: { decrement: refundAmount } } });
      await tx.auditLog.create({ data: { targetType: 'ORDER', targetId: orderId, actorUserId, action: 'PARTIAL_REFUND', toStatus: 'PARTIALLY_REFUNDED', note: 'Partial item refund with proportional voucher reversal', metadata: { items: refundItems, refundAmount: refundAmount.toFixed(2) } } });
      return this.ordersRepository.updateOrderStatus(tx, orderId, 'partially_refunded');
    });
  }

  refundPaidOrder(orderId: string, actorUserId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) throw new BadRequestException('Order not found');
      await this.orderInventoryService.restoreOrderInventory(tx, order);
      if (this.isHeldWalletPayment(order)) await this.refundWalletInTransaction(tx, order);
      await this.ordersRepository.updatePaymentStatusWithAudit(tx, { orderId, actorUserId, paymentStatus: 'REFUNDED' });
      await (tx as Prisma.TransactionClient & { voucherRedemption?: Prisma.TransactionClient['voucherRedemption'] }).voucherRedemption?.updateMany({
        where: { orderId, status: 'USED' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
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
      const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(tx, dispute.order.shopId, 'VND');
      const hold = await tx.walletTransaction.findUnique({
        where: { idempotencyKey: `DISPUTE:${dispute.id}:HOLD` },
      });
      const disputeAmount = hold?.amount ?? new Prisma.Decimal(0);
      if (disputeAmount.gt(0) && input.resolution === 'RESOLVED') {
        await this.walletRepository.executeTransactionInTransaction(tx, {
          transactionCode: `DISPUTE_RELEASE:${dispute.id}`,
          transactionType: WalletTransactionType.DISPUTE_RELEASE,
          idempotencyKey: `DISPUTE:${dispute.id}:RELEASE`,
          amount: disputeAmount,
          referenceType: 'DISPUTE', referenceId: dispute.id,
          entries: [
            { walletId: shopWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.LOCKED, amount: disputeAmount },
            { walletId: shopWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: disputeAmount },
          ],
        });
      }
      if (input.resolution === 'REFUNDED' && disputeAmount.gt(0)) {
        const buyerWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(tx, dispute.order.buyerUserId!, 'VND');
        await this.walletRepository.executeTransactionInTransaction(tx, {
          transactionCode: `DISPUTE_REFUND:${dispute.id}`,
          transactionType: WalletTransactionType.DISPUTE_REFUND,
          idempotencyKey: `DISPUTE:${dispute.id}:REFUND`,
          amount: disputeAmount,
          referenceType: 'DISPUTE', referenceId: dispute.id,
          entries: [
            { walletId: shopWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.LOCKED, amount: disputeAmount },
            { walletId: buyerWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: disputeAmount },
          ],
        });
      }
      if (input.resolution === 'REFUNDED' && dispute.order.orderStatus === 'paid') {
        await this.orderInventoryService.restoreOrderInventory(tx, dispute.order);
        await this.ordersRepository.updatePaymentStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, paymentStatus: 'REFUNDED' });
        await (tx as Prisma.TransactionClient & { voucherRedemption?: Prisma.TransactionClient['voucherRedemption'] }).voucherRedemption?.updateMany({
          where: { orderId: dispute.orderId, status: 'USED' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
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
