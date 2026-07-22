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
  escrow: { escrowStatus: string; heldAmount: Prisma.Decimal } | null;
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
      const requested = new Prisma.Decimal(order.escrow?.heldAmount ?? order.buyerPayableAmount);
      let heldAmount = new Prisma.Decimal(0);
      let affiliateReserveContribution = new Prisma.Decimal(0);
      if (order.orderStatus === 'completed') {
        const reserve = await this.ordersRepository.findLockedAffiliateReserveForOrder(tx, order.id);
        let remainingReserve = reserve ? new Prisma.Decimal(reserve.amount) : new Prisma.Decimal(0);
        const rawGroupTargets = order.shopGroups.map((group) => Prisma.Decimal.max(
          new Prisma.Decimal(0),
          new Prisma.Decimal(group.baseAmount)
            .plus(group.shippingFeeAmount)
            .minus(group.discountAmount)
            .minus(group.refundAllocations.reduce(
              (sum, allocation) => sum.plus(allocation.buyerRefundAmount),
              new Prisma.Decimal(0),
            )),
        ));
        const groupTargets = this.allocateAcrossGroups(rawGroupTargets, requested);
        const holdEntries: Array<{
          walletId: string;
          direction: WalletEntryDirection;
          balanceType: WalletBalanceType;
          amount: Prisma.Decimal;
        }> = [];

        for (const [index, group] of order.shopGroups.entries()) {
          const sellerRemaining = Prisma.Decimal.max(
            new Prisma.Decimal(0),
            new Prisma.Decimal(group.sellerReceivableAmount).minus(
              group.refundAllocations.reduce(
                (sum, allocation) => sum.plus(allocation.sellerReductionAmount),
                new Prisma.Decimal(0),
              ),
            ),
          );
          const shopContribution = Prisma.Decimal.min(groupTargets[index], sellerRemaining);
          const reservePart = reserve?.ownerShopId === group.shopId
            ? Prisma.Decimal.min(shopContribution, remainingReserve)
            : new Prisma.Decimal(0);
          remainingReserve = remainingReserve.minus(reservePart);
          affiliateReserveContribution = affiliateReserveContribution.plus(reservePart);
          const shopHoldAmount = shopContribution.minus(reservePart);
          if (shopHoldAmount.gt(0)) {
            const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(tx, group.shopId, 'VND');
            const pendingPart = Prisma.Decimal.min(shopHoldAmount, shopWallet.pendingBalance);
            const availablePart = shopHoldAmount.minus(pendingPart);
            if (availablePart.gt(shopWallet.availableBalance)) {
              throw new BadRequestException(`Shop ${group.shopId} has insufficient balance for dispute hold`);
            }
            if (pendingPart.gt(0)) holdEntries.push({ walletId: shopWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.PENDING, amount: pendingPart });
            if (availablePart.gt(0)) holdEntries.push({ walletId: shopWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount: availablePart });
            holdEntries.push({ walletId: shopWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.LOCKED, amount: shopHoldAmount });
            heldAmount = heldAmount.plus(shopHoldAmount);
          }

          const platformContribution = groupTargets[index].minus(shopContribution);
          if (platformContribution.gt(0)) {
            const revenueWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(tx, 'PLATFORM_REVENUE_VND', 'VND');
            holdEntries.push({ walletId: revenueWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.AVAILABLE, amount: platformContribution });
            holdEntries.push({ walletId: revenueWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.LOCKED, amount: platformContribution });
            heldAmount = heldAmount.plus(platformContribution);
          }
        }

        if (!heldAmount.plus(affiliateReserveContribution).equals(requested)) {
          throw new BadRequestException('Unable to fully fund the dispute hold');
        }
        if (heldAmount.gt(0)) {
        await this.walletRepository.executeTransactionInTransaction(tx, {
          transactionCode: `DISPUTE_HOLD:${dispute.id}`,
          transactionType: WalletTransactionType.DISPUTE_HOLD,
            idempotencyKey: `DISPUTE:${dispute.id}:HOLD`, amount: heldAmount,
          referenceType: 'DISPUTE', referenceId: dispute.id,
            entries: holdEntries,
        });
        }
      }
      await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: input.orderId, actorUserId: input.openedByUserId, escrowStatus: 'FROZEN', note: 'Escrow frozen because a dispute was opened' });
      await tx.auditLog.create({ data: { targetType: 'DISPUTE', targetId: dispute.id, actorUserId: input.openedByUserId, action: 'DISPUTE_OPENED', toStatus: 'OPEN', note: input.reason, metadata: { orderId: input.orderId, requestedAmount: requested.toFixed(2), lockedAmount: heldAmount.toFixed(2), affiliateReserveContribution: affiliateReserveContribution.toFixed(2), shortfallAmount: requested.minus(heldAmount).minus(affiliateReserveContribution).toFixed(2) } } });
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
    idempotencyKey: string,
  ): Promise<OrderWithRelations> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) throw new BadRequestException('Order not found');
      if (!this.isHeldWalletPayment(order)) {
        throw new BadRequestException('Partial refund currently requires a wallet payment with held escrow');
      }

      const normalizedItems = [...requestedItems.reduce((items, requested) => {
        const orderItemId = requested.orderItemId.trim();
        if (!orderItemId || !Number.isInteger(requested.quantity) || requested.quantity < 1) {
          throw new BadRequestException('Refund quantity must be greater than zero');
        }
        items.set(orderItemId, (items.get(orderItemId) ?? 0) + requested.quantity);
        return items;
      }, new Map<string, number>()).entries()]
        .map(([orderItemId, quantity]) => ({ orderItemId, quantity }))
        .sort((left, right) => left.orderItemId.localeCompare(right.orderItemId));
      if (!normalizedItems.length) throw new BadRequestException('At least one order item is required');

      const existingRefund = await tx.orderRefund.findUnique({
        where: { orderId_idempotencyKey: { orderId, idempotencyKey } },
      });
      if (existingRefund) {
        if (JSON.stringify(existingRefund.itemsJson) !== JSON.stringify(normalizedItems)) {
          throw new BadRequestException('Idempotency-Key was already used with another refund payload');
        }
        const currentOrder = await this.ordersRepository.findOrderByIdInTransaction(tx, orderId);
        if (!currentOrder) throw new BadRequestException('Order not found');
        return currentOrder;
      }

      const priorRefunds = await tx.orderRefund.findMany({
        where: { orderId, refundStatus: 'COMPLETED' },
        select: { itemsJson: true },
      });
      const refundedQuantities = new Map<string, number>();
      for (const record of priorRefunds) {
        const items = record.itemsJson as Array<{ orderItemId: string; quantity: number }>;
        for (const item of items) {
          refundedQuantities.set(item.orderItemId, (refundedQuantities.get(item.orderItemId) ?? 0) + item.quantity);
        }
      }
      const selected = normalizedItems.map((requested) => {
        const item = order.items.find((candidate) => candidate.id === requested.orderItemId);
        if (!item) throw new BadRequestException('Order item does not belong to this order');
        const refundedQuantity = refundedQuantities.get(item.id) ?? 0;
        const remaining = item.quantity - refundedQuantity;
        if (requested.quantity > remaining) throw new BadRequestException('Refund quantity exceeds remaining order quantity');
        return { item, quantity: requested.quantity, refundedQuantity };
      });

      const refund = await tx.orderRefund.create({
        data: {
          orderId,
          actorUserId,
          idempotencyKey,
          refundType: 'PARTIAL',
          refundStatus: 'PROCESSING',
          itemsJson: normalizedItems,
        },
      });

      const refundItems = selected.map(({ item, quantity, refundedQuantity }) => {
        const itemGross = new Prisma.Decimal(item.unitPrice).mul(quantity);
        const group = order.shopGroups.find((candidate) => candidate.id === item.orderShopGroupId);
        if (!group) throw new BadRequestException('Order item has no financial shop group');
        const hasStoredFinancials =
          new Prisma.Decimal(item.platformFeeAmount).gt(0) ||
          new Prisma.Decimal(item.shopProductDiscountAmount).gt(0) ||
          new Prisma.Decimal(item.systemProductDiscountAmount).gt(0);
        const groupItems = order.items.filter((candidate) => candidate.orderShopGroupId === group.id);
        const groupGross = groupItems.reduce(
          (sum, candidate) => sum.plus(new Prisma.Decimal(candidate.unitPrice).mul(candidate.quantity)),
          new Prisma.Decimal(0),
        );
        const itemOriginalGross = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
        const legacyRatio = groupGross.gt(0) ? itemOriginalGross.div(groupGross) : new Prisma.Decimal(0);
        const legacyShopDiscount = group.voucherAllocations
          .filter((allocation) => allocation.fundingSource === 'SHOP')
          .reduce((sum, allocation) => sum.plus(allocation.productDiscountAmount), new Prisma.Decimal(0))
          .mul(legacyRatio)
          .toDecimalPlaces(2);
        const legacySystemDiscount = group.voucherAllocations
          .filter((allocation) => allocation.fundingSource === 'SYSTEM')
          .reduce((sum, allocation) => sum.plus(allocation.productDiscountAmount), new Prisma.Decimal(0))
          .mul(legacyRatio)
          .toDecimalPlaces(2);
        const shopDiscount = this.allocateItemRefundAmount(
          hasStoredFinancials ? item.shopProductDiscountAmount : legacyShopDiscount,
          item.quantity,
          refundedQuantity,
          quantity,
        );
        const systemDiscount = this.allocateItemRefundAmount(
          hasStoredFinancials ? item.systemProductDiscountAmount : legacySystemDiscount,
          item.quantity,
          refundedQuantity,
          quantity,
        );
        const platformFee = this.allocateItemRefundAmount(
          hasStoredFinancials
            ? item.platformFeeAmount
            : new Prisma.Decimal(group.platformFeeAmount).mul(legacyRatio).toDecimalPlaces(2),
          item.quantity,
          refundedQuantity,
          quantity,
        );
        const buyerRefund = Prisma.Decimal.max(new Prisma.Decimal(0), itemGross.minus(shopDiscount).minus(systemDiscount)).toDecimalPlaces(2);
        const sellerReduction = Prisma.Decimal.max(
          new Prisma.Decimal(0),
          itemGross.minus(shopDiscount).minus(platformFee),
        ).toDecimalPlaces(2);
        return {
          orderItemId: item.id,
          orderShopGroupId: group.id,
          offerId: item.offerId,
          sellerShopId: group.shopId,
          brandId: item.offer?.brandId ?? '',
          quantity,
          grossAmount: itemGross.toFixed(2),
          shopVoucherDiscountAmount: shopDiscount.toDecimalPlaces(2).toFixed(2),
          systemVoucherDiscountAmount: systemDiscount.toDecimalPlaces(2).toFixed(2),
          platformFeeAmount: platformFee.toFixed(2),
          sellerReductionAmount: sellerReduction.toFixed(2),
          buyerRefundAmount: buyerRefund.toFixed(2),
        };
      });
      const refundAmount = refundItems.reduce((sum, item) => sum.plus(item.buyerRefundAmount), new Prisma.Decimal(0)).toDecimalPlaces(2);
      if (refundAmount.lte(0)) throw new BadRequestException('Refund amount must be greater than zero');
      await this.orderInventoryService.restoreOrderInventory(tx, {
        items: selected.map(({ item, quantity }) => ({ ...item, quantity })),
      });
      const userWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(tx, order.buyerUserId!, 'VND');
      const escrowWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(tx, 'PLATFORM_ESCROW_VND', 'VND');
      await this.walletRepository.executeTransactionInTransaction(tx, {
        transactionCode: `PARTIAL_REFUND:${refund.id}`,
        transactionType: WalletTransactionType.REFUND,
        idempotencyKey: `ORDER:${order.id}:PARTIAL_REFUND:${idempotencyKey}`,
        amount: refundAmount,
        currency: 'VND', referenceType: 'ORDER', referenceId: order.id,
        orderId: order.id, paymentIntentId: order.paymentIntent!.id,
        description: 'Partial refund to buyer with voucher allocation reversal',
        entries: [
          { walletId: escrowWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.PENDING, amount: refundAmount },
          { walletId: userWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: refundAmount },
        ],
      });
      const escrowUpdate = await tx.escrow.updateMany({
        where: { orderId, heldAmount: { gte: refundAmount }, escrowStatus: 'HELD' },
        data: { heldAmount: { decrement: refundAmount } },
      });
      if (escrowUpdate.count !== 1) throw new BadRequestException('Refund exceeds held escrow balance');
      await this.ordersRepository.applyAffiliatePartialRefund(
        tx,
        orderId,
        refundItems.map((item) => ({
          offerId: item.offerId,
          sellerShopId: item.sellerShopId,
          brandId: item.brandId,
          grossAmount: item.grossAmount,
          shopProductDiscountAmount: item.shopVoucherDiscountAmount,
        })),
      );
      const groupAllocations = [...refundItems.reduce((groups, item) => {
        const current = groups.get(item.orderShopGroupId) ?? {
          base: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          buyer: new Prisma.Decimal(0),
          platform: new Prisma.Decimal(0),
          seller: new Prisma.Decimal(0),
        };
        current.base = current.base.plus(item.grossAmount);
        current.discount = current.discount
          .plus(item.shopVoucherDiscountAmount)
          .plus(item.systemVoucherDiscountAmount);
        current.buyer = current.buyer.plus(item.buyerRefundAmount);
        current.platform = current.platform.plus(item.platformFeeAmount);
        current.seller = current.seller.plus(item.sellerReductionAmount);
        groups.set(item.orderShopGroupId, current);
        return groups;
      }, new Map<string, {
        base: Prisma.Decimal;
        discount: Prisma.Decimal;
        buyer: Prisma.Decimal;
        platform: Prisma.Decimal;
        seller: Prisma.Decimal;
      }>()).entries()];
      await tx.orderRefundShopGroup.createMany({
        data: groupAllocations.map(([orderShopGroupId, allocation]) => ({
          refundId: refund.id,
          orderShopGroupId,
          baseReductionAmount: allocation.base,
          discountReductionAmount: allocation.discount,
          buyerRefundAmount: allocation.buyer,
          platformFeeReductionAmount: allocation.platform,
          sellerReductionAmount: allocation.seller,
        })),
      });
      await tx.orderRefund.update({
        where: { id: refund.id },
        data: { refundStatus: 'COMPLETED', totalAmount: refundAmount },
      });
      await tx.auditLog.create({ data: { targetType: 'ORDER', targetId: orderId, actorUserId, action: 'PARTIAL_REFUND', toStatus: 'PARTIALLY_REFUNDED', note: 'Partial item refund with proportional voucher reversal', metadata: { items: refundItems, refundAmount: refundAmount.toFixed(2) } } });
      return this.ordersRepository.updateOrderStatus(tx, orderId, 'partially_refunded');
    });
  }

  private allocateItemRefundAmount(
    totalAmount: Prisma.Decimal.Value,
    originalQuantity: number,
    alreadyRefundedQuantity: number,
    requestedQuantity: number,
  ) {
    const total = new Prisma.Decimal(totalAmount);
    const before = total.mul(alreadyRefundedQuantity).div(originalQuantity).toDecimalPlaces(2);
    const after = total
      .mul(alreadyRefundedQuantity + requestedQuantity)
      .div(originalQuantity)
      .toDecimalPlaces(2);
    return after.minus(before);
  }

  private allocateAcrossGroups(weights: Prisma.Decimal[], total: Prisma.Decimal) {
    const weightTotal = weights.reduce(
      (sum, weight) => sum.plus(weight),
      new Prisma.Decimal(0),
    );
    if (weights.length === 0 || weightTotal.lte(0)) {
      throw new BadRequestException('Order has no refundable shop group');
    }
    let allocated = new Prisma.Decimal(0);
    return weights.map((weight, index) => {
      if (index === weights.length - 1) return total.minus(allocated).toDecimalPlaces(2);
      const amount = total.mul(weight).div(weightTotal).toDecimalPlaces(2);
      allocated = allocated.plus(amount);
      return amount;
    });
  }

  refundPaidOrder(orderId: string, actorUserId: string): Promise<OrderWithRelations> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const order = await this.ordersRepository.findOrderForReversal(tx, orderId);
      if (!order) throw new BadRequestException('Order not found');
      const priorRefunds = await tx.orderRefund.findMany({
        where: { orderId, refundStatus: 'COMPLETED' },
        select: { itemsJson: true },
      });
      const refundedQuantities = new Map<string, number>();
      for (const record of priorRefunds) {
        for (const item of record.itemsJson as Array<{ orderItemId: string; quantity: number }>) {
          refundedQuantities.set(
            item.orderItemId,
            (refundedQuantities.get(item.orderItemId) ?? 0) + item.quantity,
          );
        }
      }
      const remainingItems = order.items
        .map((item) => ({
          ...item,
          quantity: item.quantity - (refundedQuantities.get(item.id) ?? 0),
        }))
        .filter((item) => item.quantity > 0);
      if (remainingItems.length) {
        await this.orderInventoryService.restoreOrderInventory(tx, { items: remainingItems });
      }
      if (this.isHeldWalletPayment(order)) {
        await this.refundWalletInTransaction(tx, order, order.escrow!.heldAmount);
      }
      await this.ordersRepository.updatePaymentStatusWithAudit(tx, { orderId, actorUserId, paymentStatus: 'REFUNDED' });
      await (tx as Prisma.TransactionClient & { voucherRedemption?: Prisma.TransactionClient['voucherRedemption'] }).voucherRedemption?.updateMany({
        where: { orderId, status: 'USED' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId, actorUserId, escrowStatus: 'REFUNDED', note: 'Escrow refunded because order was refunded' });
      await this.releaseAffiliateReserve(tx, orderId);
      await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, orderId);
      return this.ordersRepository.updateOrderStatus(tx, orderId, 'refunded');
    });
  }

  private isHeldWalletPayment(order: WalletRefundOrder) {
    return ['paid', 'partially_refunded'].includes(order.orderStatus) && order.paymentIntent?.paymentMethod === 'WALLET' &&
      order.paymentIntent.paymentStatus === 'PAID' && order.escrow?.escrowStatus === 'HELD';
  }

  private async refundWalletInTransaction(
    tx: Prisma.TransactionClient,
    order: WalletRefundOrder,
    amount: Prisma.Decimal.Value = order.buyerPayableAmount,
  ) {
    if (!order.buyerUserId || !order.paymentIntent) throw new BadRequestException('Wallet refund requires a user buyer');
    const refundAmount = new Prisma.Decimal(amount);
    if (refundAmount.lte(0)) throw new BadRequestException('Refund amount must be greater than zero');
    const userWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(tx, order.buyerUserId, 'VND');
    const escrowWallet = await this.walletRepository.findOrCreatePlatformWalletInTransaction(tx, 'PLATFORM_ESCROW_VND', 'VND');
    return this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `REFUND:${order.id}`,
      transactionType: WalletTransactionType.REFUND,
      idempotencyKey: `ORDER:${order.id}:WALLET_REFUND`,
      amount: refundAmount,
      currency: 'VND', referenceType: 'ORDER', referenceId: order.id,
      orderId: order.id, paymentIntentId: order.paymentIntent.id,
      description: 'Refund wallet payment to buyer',
      entries: [
        { walletId: escrowWallet.id, direction: WalletEntryDirection.DEBIT, balanceType: WalletBalanceType.PENDING, amount: refundAmount },
        { walletId: userWallet.id, direction: WalletEntryDirection.CREDIT, balanceType: WalletBalanceType.AVAILABLE, amount: refundAmount },
      ],
    });
  }

  private async releaseAffiliateReserve(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const reserve = await this.ordersRepository.findLockedAffiliateReserveForOrder(
      tx,
      orderId,
    );
    if (!reserve) {
      return;
    }
    const amount = new Prisma.Decimal(reserve.amount);
    const shopWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(
      tx,
      reserve.ownerShopId,
      'VND',
    );
    await this.walletRepository.executeTransactionInTransaction(tx, {
      transactionCode: `AFFILIATE_RESERVE_RELEASE:${orderId}`,
      transactionType: WalletTransactionType.AFFILIATE_COMMISSION,
      idempotencyKey: `ORDER:${orderId}:AFFILIATE_RESERVE_RELEASE`,
      amount,
      currency: 'VND',
      referenceType: 'ORDER',
      referenceId: orderId,
      entries: [
        {
          walletId: shopWallet.id,
          direction: WalletEntryDirection.DEBIT,
          balanceType: WalletBalanceType.LOCKED,
          amount,
        },
        {
          walletId: shopWallet.id,
          direction: WalletEntryDirection.CREDIT,
          balanceType: WalletBalanceType.AVAILABLE,
          amount,
        },
      ],
    });
  }

  resolveDispute(input: { disputeId: string; actorUserId: string; resolution: 'RESOLVED' | 'REFUNDED' }): Promise<DisputeWithOrder> {
    return this.ordersRepository.withSerializableTransaction(async (tx) => {
      const dispute = await this.ordersRepository.findDisputeForResolution(tx, input.disputeId);
      if (!dispute) throw new BadRequestException('Dispute not found');
      const hold = await tx.walletTransaction.findUnique({
        where: { idempotencyKey: `DISPUTE:${dispute.id}:HOLD` },
        include: { ledgerEntries: true },
      });
      const holdAmount = new Prisma.Decimal(hold?.amount ?? 0);
      if (holdAmount.gt(0) && input.resolution === 'RESOLVED') {
        const releaseEntries = [
          ...hold!.ledgerEntries
            .filter((entry) => entry.direction === WalletEntryDirection.CREDIT && entry.balanceType === WalletBalanceType.LOCKED)
            .map((entry) => ({
              walletId: entry.walletId,
              direction: WalletEntryDirection.DEBIT,
              balanceType: WalletBalanceType.LOCKED,
              amount: entry.amount,
            })),
          ...hold!.ledgerEntries
            .filter((entry) => entry.direction === WalletEntryDirection.DEBIT)
            .map((entry) => ({
              walletId: entry.walletId,
              direction: WalletEntryDirection.CREDIT,
              balanceType: entry.balanceType,
              amount: entry.amount,
            })),
        ];
        await this.walletRepository.executeTransactionInTransaction(tx, {
          transactionCode: `DISPUTE_RELEASE:${dispute.id}`,
          transactionType: WalletTransactionType.DISPUTE_RELEASE,
          idempotencyKey: `DISPUTE:${dispute.id}:RELEASE`,
          amount: holdAmount,
          referenceType: 'DISPUTE', referenceId: dispute.id,
          entries: releaseEntries,
        });
      }
      if (input.resolution === 'REFUNDED') {
        const refundableStatuses = ['paid', 'partially_refunded', 'completed'];
        if (!refundableStatuses.includes(dispute.order.orderStatus)) {
          throw new BadRequestException('Order is not refundable through dispute resolution');
        }
        if (!dispute.order.buyerUserId || !dispute.order.escrow) {
          throw new BadRequestException('Dispute refund requires a user buyer and escrow');
        }
        const refundAmount = new Prisma.Decimal(dispute.order.escrow.heldAmount);
        if (refundAmount.lte(0)) throw new BadRequestException('Dispute has no refundable amount');
        await this.restoreRemainingInventory(tx, dispute.orderId, dispute.order.items);

        if (dispute.order.orderStatus === 'completed') {
          const reserve = await this.ordersRepository.findLockedAffiliateReserveForOrder(tx, dispute.orderId);
          const reserveAmount = new Prisma.Decimal(reserve?.amount ?? 0);
          const affiliateContribution = refundAmount.minus(holdAmount);
          if (affiliateContribution.lt(0) || affiliateContribution.gt(reserveAmount)) {
            throw new BadRequestException('Dispute hold does not match the refundable order balance');
          }
          const lockedDebits = new Map<string, Prisma.Decimal>();
          for (const entry of hold?.ledgerEntries ?? []) {
            if (entry.direction === WalletEntryDirection.CREDIT && entry.balanceType === WalletBalanceType.LOCKED) {
              lockedDebits.set(
                entry.walletId,
                (lockedDebits.get(entry.walletId) ?? new Prisma.Decimal(0)).plus(entry.amount),
              );
            }
          }
          let reserveWalletId: string | null = null;
          if (reserve && reserveAmount.gt(0)) {
            const reserveWallet = await this.walletRepository.findOrCreateShopWalletInTransaction(tx, reserve.ownerShopId, 'VND');
            reserveWalletId = reserveWallet.id;
            lockedDebits.set(
              reserveWallet.id,
              (lockedDebits.get(reserveWallet.id) ?? new Prisma.Decimal(0)).plus(reserveAmount),
            );
          }
          const buyerWallet = await this.walletRepository.findOrCreateUserWalletInTransaction(tx, dispute.order.buyerUserId, 'VND');
          const reserveExcess = reserveAmount.minus(affiliateContribution);
          const refundEntries = [
            ...[...lockedDebits.entries()].map(([walletId, amount]) => ({
              walletId,
              direction: WalletEntryDirection.DEBIT,
              balanceType: WalletBalanceType.LOCKED,
              amount,
            })),
            {
              walletId: buyerWallet.id,
              direction: WalletEntryDirection.CREDIT,
              balanceType: WalletBalanceType.AVAILABLE,
              amount: refundAmount,
            },
            ...(reserveWalletId && reserveExcess.gt(0) ? [{
              walletId: reserveWalletId,
              direction: WalletEntryDirection.CREDIT,
              balanceType: WalletBalanceType.AVAILABLE,
              amount: reserveExcess,
            }] : []),
          ];
          await this.walletRepository.executeTransactionInTransaction(tx, {
            transactionCode: `DISPUTE_REFUND:${dispute.id}`,
            transactionType: WalletTransactionType.DISPUTE_REFUND,
            idempotencyKey: `DISPUTE:${dispute.id}:REFUND`,
            amount: holdAmount.plus(reserveAmount),
            referenceType: 'DISPUTE',
            referenceId: dispute.id,
            orderId: dispute.orderId,
            paymentIntentId: dispute.order.paymentIntent?.id ?? null,
            entries: refundEntries,
          });
        } else {
          await this.refundWalletInTransaction(tx, dispute.order, refundAmount);
        }

        await this.ordersRepository.updatePaymentStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, paymentStatus: 'REFUNDED' });
        await (tx as Prisma.TransactionClient & { voucherRedemption?: Prisma.TransactionClient['voucherRedemption'] }).voucherRedemption?.updateMany({
          where: { orderId: dispute.orderId, status: 'USED' },
          data: { status: 'RELEASED', releasedAt: new Date() },
        });
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, escrowStatus: 'REFUNDED', note: 'Escrow refunded by dispute resolution' });
        if (dispute.order.orderStatus !== 'completed') {
          await this.releaseAffiliateReserve(tx, dispute.orderId);
        }
        await this.ordersRepository.cancelRefundableAffiliateArtifacts(tx, dispute.orderId);
        await this.ordersRepository.updateOrderStatus(tx, dispute.orderId, 'refunded');
      } else if (input.resolution === 'RESOLVED' && dispute.order.orderStatus === 'completed') {
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, escrowStatus: 'RELEASED', note: 'Escrow released after dispute was resolved without refund' });
      } else if (
        input.resolution === 'RESOLVED' &&
        ['paid', 'partially_refunded'].includes(dispute.order.orderStatus)
      ) {
        await this.ordersRepository.updateEscrowStatusWithAudit(tx, { orderId: dispute.orderId, actorUserId: input.actorUserId, escrowStatus: 'HELD', note: 'Escrow returned to hold after dispute was resolved without refund' });
      }
      return this.ordersRepository.updateDisputeStatus(tx, input.disputeId, input.resolution);
    });
  }

  private async restoreRemainingInventory(
    tx: Prisma.TransactionClient,
    orderId: string,
    items: Array<{ id: string; quantity: number } & Record<string, unknown>>,
  ) {
    const refunds = await tx.orderRefund.findMany({
      where: { orderId, refundStatus: 'COMPLETED' },
      select: { itemsJson: true },
    });
    const refunded = new Map<string, number>();
    for (const refund of refunds) {
      for (const item of refund.itemsJson as Array<{ orderItemId: string; quantity: number }>) {
        refunded.set(item.orderItemId, (refunded.get(item.orderItemId) ?? 0) + item.quantity);
      }
    }
    const remaining = items
      .map((item) => ({ ...item, quantity: item.quantity - (refunded.get(item.id) ?? 0) }))
      .filter((item) => item.quantity > 0);
    if (remaining.length) {
      await this.orderInventoryService.restoreOrderInventory(tx, { items: remaining } as never);
    }
  }
}
