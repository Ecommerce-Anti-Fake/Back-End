import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderInventoryService } from './order-inventory.service';
import { OrderReversalService } from './order-reversal.service';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { WalletRepository } from '@wallet';

describe('OrderReversalService', () => {
  let service: OrderReversalService;

  const tx = {
    id: 'tx',
    walletTransaction: { findUnique: jest.fn().mockResolvedValue(null) },
    dispute: { findFirst: jest.fn(), create: jest.fn() },
    auditLog: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    escrow: { update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    orderRefund: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'refund-1' }),
      update: jest.fn(),
    },
    orderRefundShopGroup: { createMany: jest.fn() },
  };
  const ordersRepositoryMock = {
    withTransaction: jest.fn(),
    withSerializableTransaction: jest.fn(),
    findOrderForReversal: jest.fn(),
    updatePaymentStatusWithAudit: jest.fn(),
    updateEscrowStatusWithAudit: jest.fn(),
    cancelPendingAffiliateArtifacts: jest.fn(),
    cancelRefundableAffiliateArtifacts: jest.fn(),
    updateOrderStatus: jest.fn(),
    cancelShopGroupFulfillment: jest.fn(),
    findDisputeForResolution: jest.fn(),
    updateDisputeStatus: jest.fn(),
    applyAffiliatePartialRefund: jest.fn(),
    findLockedAffiliateReserveForOrder: jest.fn(),
    findOrderByIdInTransaction: jest.fn(),
  };
  const orderInventoryServiceMock = {
    restoreOrderInventory: jest.fn(),
  };
  const walletRepositoryMock = {
    findOrCreateUserWalletInTransaction: jest.fn(),
    findOrCreatePlatformWalletInTransaction: jest.fn(),
    findOrCreateShopWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    ordersRepositoryMock.withTransaction.mockImplementation((callback) => callback(tx));
    ordersRepositoryMock.withSerializableTransaction.mockImplementation((callback) => callback(tx));
    walletRepositoryMock.findOrCreateUserWalletInTransaction.mockResolvedValue({ id: 'user-wallet' });
    walletRepositoryMock.findOrCreatePlatformWalletInTransaction.mockResolvedValue({ id: 'escrow-wallet' });
    walletRepositoryMock.findOrCreateShopWalletInTransaction.mockResolvedValue({ id: 'shop-wallet', availableBalance: 0, pendingBalance: 0 });
    ordersRepositoryMock.findLockedAffiliateReserveForOrder.mockResolvedValue(null);
    tx.orderRefund.findUnique.mockResolvedValue(null);
    tx.orderRefund.findMany.mockResolvedValue([]);
    tx.orderRefund.create.mockResolvedValue({ id: 'refund-1' });
    tx.escrow.updateMany.mockResolvedValue({ count: 1 });
    tx.dispute.findFirst.mockResolvedValue(null);
    tx.dispute.create.mockResolvedValue({
      id: 'dispute-1',
      orderId: 'order-1',
      disputeStatus: 'OPEN',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderReversalService,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderInventoryService, useValue: orderInventoryServiceMock },
        { provide: WalletRepository, useValue: walletRepositoryMock },
      ],
    }).compile();

    service = module.get<OrderReversalService>(OrderReversalService);
  });

  it('cancels order payment and escrow together', async () => {
    const order = createOrderRecord('pending');
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);
    ordersRepositoryMock.updateOrderStatus.mockResolvedValueOnce({ ...order, orderStatus: 'cancelled' });

    await service.cancelOrder('order-1', 'buyer-1');

    expect(ordersRepositoryMock.updatePaymentStatusWithAudit).toHaveBeenCalledWith(tx, {
      orderId: 'order-1',
      actorUserId: 'buyer-1',
      paymentStatus: 'CANCELLED',
    });
    expect(ordersRepositoryMock.updateEscrowStatusWithAudit).toHaveBeenCalledWith(tx, {
      orderId: 'order-1',
      actorUserId: 'buyer-1',
      escrowStatus: 'CANCELLED',
      note: 'Escrow cancelled because order was cancelled',
    });
  });

  it('refunds order payment and escrow together', async () => {
    const order = createOrderRecord('paid');
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);
    ordersRepositoryMock.updateOrderStatus.mockResolvedValueOnce({ ...order, orderStatus: 'refunded' });

    await service.refundPaidOrder('order-1', 'seller-1');

    expect(ordersRepositoryMock.updatePaymentStatusWithAudit).toHaveBeenCalledWith(tx, {
      orderId: 'order-1',
      actorUserId: 'seller-1',
      paymentStatus: 'REFUNDED',
    });
    expect(ordersRepositoryMock.updateEscrowStatusWithAudit).toHaveBeenCalledWith(tx, {
      orderId: 'order-1',
      actorUserId: 'seller-1',
      escrowStatus: 'REFUNDED',
      note: 'Escrow refunded because order was refunded',
    });
    expect(walletRepositoryMock.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'REFUND',
      idempotencyKey: 'ORDER:order-1:WALLET_REFUND',
      referenceType: 'ORDER',
      referenceId: 'order-1',
      entries: expect.arrayContaining([
        expect.objectContaining({ walletId: 'escrow-wallet', direction: 'DEBIT', balanceType: 'PENDING' }),
        expect.objectContaining({ walletId: 'user-wallet', direction: 'CREDIT', balanceType: 'AVAILABLE' }),
      ]),
    }));
  });

  it('rejects wallet cancellation after escrow release', async () => {
    const order = { ...createOrderRecord('paid'), escrow: { escrowStatus: 'RELEASED' } };
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);

    await expect(service.cancelOrder('order-1', 'buyer-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(walletRepositoryMock.executeTransactionInTransaction).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('returns escrow to hold when a paid dispute is resolved without refund', async () => {
    const dispute = createDisputeRecord('paid');
    ordersRepositoryMock.findDisputeForResolution.mockResolvedValueOnce(dispute);
    ordersRepositoryMock.updateDisputeStatus.mockResolvedValueOnce({ ...dispute, disputeStatus: 'RESOLVED' });

    await service.resolveDispute({
      disputeId: 'dispute-1',
      actorUserId: 'admin-1',
      resolution: 'RESOLVED',
    });

    expect(ordersRepositoryMock.updateEscrowStatusWithAudit).toHaveBeenCalledWith(tx, {
      orderId: 'order-1',
      actorUserId: 'admin-1',
      escrowStatus: 'HELD',
      note: 'Escrow returned to hold after dispute was resolved without refund',
    });
  });

  it('fails when reversing an unknown order', async () => {
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(null);

    await expect(service.refundPaidOrder('missing-order', 'seller-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns escrow to hold when a partially refunded dispute is resolved', async () => {
    const dispute = createDisputeRecord('partially_refunded');
    ordersRepositoryMock.findDisputeForResolution.mockResolvedValueOnce(dispute);
    ordersRepositoryMock.updateDisputeStatus.mockResolvedValueOnce({ ...dispute, disputeStatus: 'RESOLVED' });

    await service.resolveDispute({
      disputeId: 'dispute-1',
      actorUserId: 'admin-1',
      resolution: 'RESOLVED',
    });

    expect(ordersRepositoryMock.updateEscrowStatusWithAudit).toHaveBeenCalledWith(tx, {
      orderId: 'order-1',
      actorUserId: 'admin-1',
      escrowStatus: 'HELD',
      note: 'Escrow returned to hold after dispute was resolved without refund',
    });
  });

  it('fully funds a completed multi-shop dispute from seller, platform, and affiliate locks', async () => {
    const order = createCompletedMultiShopOrder();
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);
    ordersRepositoryMock.findLockedAffiliateReserveForOrder.mockResolvedValueOnce({
      ownerShopId: 'shop-1',
      amount: 8,
    });
    walletRepositoryMock.findOrCreateShopWalletInTransaction.mockImplementation(
      (_tx: unknown, shopId: string) => Promise.resolve({
        id: `wallet-${shopId}`,
        pendingBalance: shopId === 'shop-1' ? 40 : 32,
        availableBalance: 0,
      }),
    );
    walletRepositoryMock.findOrCreatePlatformWalletInTransaction.mockResolvedValue({
      id: 'platform-revenue-wallet',
      availableBalance: 20,
    });

    await service.openDispute({
      orderId: 'order-1',
      openedByUserId: 'buyer-1',
      reason: 'Wrong products',
    });

    expect(walletRepositoryMock.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        transactionType: 'DISPUTE_HOLD',
        amount: expect.objectContaining({}),
        entries: expect.arrayContaining([
          expect.objectContaining({ walletId: 'wallet-shop-1', direction: 'CREDIT', balanceType: 'LOCKED' }),
          expect.objectContaining({ walletId: 'wallet-shop-2', direction: 'CREDIT', balanceType: 'LOCKED' }),
          expect.objectContaining({ walletId: 'platform-revenue-wallet', direction: 'CREDIT', balanceType: 'LOCKED' }),
        ]),
      }),
    );
  });

  it('refunds a completed multi-shop dispute by consuming its hold and affiliate reserve', async () => {
    const order = createCompletedMultiShopOrder();
    const dispute = { id: 'dispute-1', orderId: order.id, disputeStatus: 'OPEN', order };
    ordersRepositoryMock.findDisputeForResolution.mockResolvedValueOnce(dispute);
    ordersRepositoryMock.findLockedAffiliateReserveForOrder.mockResolvedValueOnce({
      ownerShopId: 'shop-1',
      amount: 8,
    });
    ordersRepositoryMock.updateDisputeStatus.mockResolvedValueOnce({ ...dispute, disputeStatus: 'REFUNDED' });
    tx.walletTransaction.findUnique.mockResolvedValueOnce({
      amount: 92,
      ledgerEntries: [
        { walletId: 'wallet-shop-1', direction: 'CREDIT', balanceType: 'LOCKED', amount: 40 },
        { walletId: 'wallet-shop-2', direction: 'CREDIT', balanceType: 'LOCKED', amount: 32 },
        { walletId: 'platform-revenue-wallet', direction: 'CREDIT', balanceType: 'LOCKED', amount: 20 },
      ],
    });
    walletRepositoryMock.findOrCreateShopWalletInTransaction.mockResolvedValue({ id: 'wallet-shop-1' });

    await service.resolveDispute({
      disputeId: 'dispute-1',
      actorUserId: 'admin-1',
      resolution: 'REFUNDED',
    });

    expect(walletRepositoryMock.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        transactionType: 'DISPUTE_REFUND',
        idempotencyKey: 'DISPUTE:dispute-1:REFUND',
        entries: expect.arrayContaining([
          expect.objectContaining({ walletId: 'wallet-shop-1', direction: 'DEBIT', balanceType: 'LOCKED' }),
          expect.objectContaining({ walletId: 'wallet-shop-2', direction: 'DEBIT', balanceType: 'LOCKED' }),
          expect.objectContaining({ walletId: 'platform-revenue-wallet', direction: 'DEBIT', balanceType: 'LOCKED' }),
          expect.objectContaining({ walletId: 'user-wallet', direction: 'CREDIT', balanceType: 'AVAILABLE', amount: expect.anything() }),
        ]),
      }),
    );
    expect(ordersRepositoryMock.cancelRefundableAffiliateArtifacts).toHaveBeenCalledWith(tx, 'order-1');
  });

  it('refunds selected item quantity and reverses voucher discount proportionally', async () => {
    tx.auditLog.findMany.mockResolvedValueOnce([]);
    const order = {
      ...createOrderRecord('paid'),
      items: [{
        id: 'item-1', orderItemId: 'item-1', offerId: 'offer-1', variantId: 'variant-1',
        quantity: 2, unitPrice: 100, orderShopGroupId: 'group-1', batchAllocations: [],
        platformFeeAmount: 20, shopProductDiscountAmount: 20, systemProductDiscountAmount: 0,
        offer: { brandId: 'brand-1' },
      }],
      shopGroups: [{
        id: 'group-1', shopId: 'shop-1', platformFeeAmount: 20,
        voucherAllocations: [{ fundingSource: 'SHOP', productDiscountAmount: 20 }],
      }],
    };
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);
    ordersRepositoryMock.updateOrderStatus.mockResolvedValueOnce({ ...order, orderStatus: 'partially_refunded' });

    await service.partialRefundPaidOrder(
      'order-1',
      'seller-1',
      [{ orderItemId: 'item-1', quantity: 1 }],
      'refund-request-1',
    );

    expect(walletRepositoryMock.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'REFUND',
      amount: expect.anything(),
      idempotencyKey: 'ORDER:order-1:PARTIAL_REFUND:refund-request-1',
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PARTIAL_REFUND', toStatus: 'PARTIALLY_REFUNDED' }),
    }));
    expect(orderInventoryServiceMock.restoreOrderInventory).toHaveBeenCalledWith(tx, expect.objectContaining({
      items: [expect.objectContaining({ id: 'item-1', quantity: 1 })],
    }));
    expect(ordersRepositoryMock.applyAffiliatePartialRefund).toHaveBeenCalledWith(
      tx,
      'order-1',
      [expect.objectContaining({ offerId: 'offer-1', grossAmount: '100.00' })],
    );
    expect(tx.orderRefund.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'refund-1' },
      data: expect.objectContaining({ refundStatus: 'COMPLETED' }),
    }));
  });

  it('returns the prior result without mutating balances when a partial refund is retried', async () => {
    const order = createOrderRecord('partially_refunded');
    const currentOrder = { ...order, marker: 'current' };
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);
    tx.orderRefund.findUnique.mockResolvedValueOnce({
      itemsJson: [{ orderItemId: 'item-1', quantity: 1 }],
    });
    ordersRepositoryMock.findOrderByIdInTransaction.mockResolvedValueOnce(currentOrder);

    await expect(service.partialRefundPaidOrder(
      'order-1',
      'seller-1',
      [{ orderItemId: 'item-1', quantity: 1 }],
      'refund-request-1',
    )).resolves.toBe(currentOrder);

    expect(orderInventoryServiceMock.restoreOrderInventory).not.toHaveBeenCalled();
    expect(walletRepositoryMock.executeTransactionInTransaction).not.toHaveBeenCalled();
    expect(tx.escrow.updateMany).not.toHaveBeenCalled();
  });

  it('releases a locked affiliate reserve before cancelling a refunded conversion', async () => {
    const order = createOrderRecord('paid');
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);
    ordersRepositoryMock.updateOrderStatus.mockResolvedValueOnce({ ...order, orderStatus: 'refunded' });
    ordersRepositoryMock.findLockedAffiliateReserveForOrder.mockResolvedValueOnce({
      ownerShopId: 'shop-1',
      amount: 8,
    });

    await service.refundPaidOrder('order-1', 'seller-1');

    expect(walletRepositoryMock.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        transactionType: 'AFFILIATE_COMMISSION',
        idempotencyKey: 'ORDER:order-1:AFFILIATE_RESERVE_RELEASE',
        entries: [
          expect.objectContaining({ direction: 'DEBIT', balanceType: 'LOCKED', amount: expect.anything() }),
          expect.objectContaining({ direction: 'CREDIT', balanceType: 'AVAILABLE', amount: expect.anything() }),
        ],
      }),
    );
    expect(ordersRepositoryMock.cancelRefundableAffiliateArtifacts).toHaveBeenCalledWith(tx, 'order-1');
  });

  it('restores only the inventory belonging to the cancelled shop group', async () => {
    const order = {
      ...createOrderRecord('paid'),
      items: [
        { id: 'item-1', orderShopGroupId: 'group-1', offerId: 'offer-1', quantity: 1, batchAllocations: [] },
        { id: 'item-2', orderShopGroupId: 'group-2', offerId: 'offer-2', quantity: 2, batchAllocations: [] },
      ],
    };
    ordersRepositoryMock.findOrderForReversal.mockResolvedValueOnce(order);
    ordersRepositoryMock.cancelShopGroupFulfillment.mockResolvedValueOnce(order);

    await service.cancelOrderShopGroup('order-1', 'group-2');

    expect(orderInventoryServiceMock.restoreOrderInventory).toHaveBeenCalledWith(tx, {
      items: [order.items[1]],
    });
    expect(ordersRepositoryMock.cancelShopGroupFulfillment).toHaveBeenCalledWith(tx, {
      orderId: 'order-1',
      groupId: 'group-2',
    });
    expect(ordersRepositoryMock.updatePaymentStatusWithAudit).not.toHaveBeenCalled();
    expect(ordersRepositoryMock.updateOrderStatus).not.toHaveBeenCalled();
  });
});

function createOrderRecord(orderStatus: string) {
  return {
    id: 'order-1',
    orderStatus,
    items: [],
    shopGroups: [],
    buyerPayableAmount: 100,
    buyerUserId: 'buyer-1',
    paymentIntent: ['paid', 'partially_refunded'].includes(orderStatus)
      ? { id: 'payment-1', paymentMethod: 'WALLET', paymentStatus: 'PAID' }
      : null,
    escrow: ['paid', 'partially_refunded'].includes(orderStatus)
      ? { escrowStatus: 'HELD', heldAmount: 100 }
      : null,
  };
}

function createDisputeRecord(orderStatus: string) {
  return {
    id: 'dispute-1',
    orderId: 'order-1',
    disputeStatus: 'OPEN',
    order: createOrderRecord(orderStatus),
  };
}

function createCompletedMultiShopOrder() {
  return {
    ...createOrderRecord('completed'),
    buyerUserId: 'buyer-1',
    buyerPayableAmount: 100,
    paymentIntent: { id: 'payment-1', paymentMethod: 'WALLET', paymentStatus: 'PAID' },
    escrow: { escrowStatus: 'RELEASED', heldAmount: 100 },
    items: [],
    shopGroups: [
      {
        id: 'group-1', shopId: 'shop-1', baseAmount: 60, shippingFeeAmount: 0,
        discountAmount: 0, sellerReceivableAmount: 48, refundAllocations: [],
      },
      {
        id: 'group-2', shopId: 'shop-2', baseAmount: 40, shippingFeeAmount: 0,
        discountAmount: 0, sellerReceivableAmount: 32, refundAllocations: [],
      },
    ],
  };
}
