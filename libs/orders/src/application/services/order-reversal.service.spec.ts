import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderInventoryService } from './order-inventory.service';
import { OrderReversalService } from './order-reversal.service';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';
import { WalletRepository } from '@wallet';

describe('OrderReversalService', () => {
  let service: OrderReversalService;

  const tx = { id: 'tx' };
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
  };
  const orderInventoryServiceMock = {
    restoreOrderInventory: jest.fn(),
  };
  const walletRepositoryMock = {
    findOrCreateUserWalletInTransaction: jest.fn(),
    findOrCreatePlatformWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    ordersRepositoryMock.withTransaction.mockImplementation((callback) => callback(tx));
    ordersRepositoryMock.withSerializableTransaction.mockImplementation((callback) => callback(tx));
    walletRepositoryMock.findOrCreateUserWalletInTransaction.mockResolvedValue({ id: 'user-wallet' });
    walletRepositoryMock.findOrCreatePlatformWalletInTransaction.mockResolvedValue({ id: 'escrow-wallet' });

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
    buyerPayableAmount: 100,
    buyerUserId: 'buyer-1',
    paymentIntent: orderStatus === 'paid' ? { id: 'payment-1', paymentMethod: 'WALLET', paymentStatus: 'PAID' } : null,
    escrow: orderStatus === 'paid' ? { escrowStatus: 'HELD' } : null,
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
