import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderInventoryService } from './order-inventory.service';
import { OrderReversalService } from './order-reversal.service';
import { OrdersRepository } from '../../infrastructure/persistence/orders.repository';

describe('OrderReversalService', () => {
  let service: OrderReversalService;

  const tx = { id: 'tx' };
  const ordersRepositoryMock = {
    withTransaction: jest.fn(),
    findOrderForReversal: jest.fn(),
    updatePaymentStatusWithAudit: jest.fn(),
    updateEscrowStatusWithAudit: jest.fn(),
    cancelPendingAffiliateArtifacts: jest.fn(),
    cancelRefundableAffiliateArtifacts: jest.fn(),
    updateOrderStatus: jest.fn(),
    findDisputeForResolution: jest.fn(),
    updateDisputeStatus: jest.fn(),
  };
  const orderInventoryServiceMock = {
    restoreOrderInventory: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    ordersRepositoryMock.withTransaction.mockImplementation((callback) => callback(tx));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderReversalService,
        { provide: OrdersRepository, useValue: ordersRepositoryMock },
        { provide: OrderInventoryService, useValue: orderInventoryServiceMock },
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
});

function createOrderRecord(orderStatus: string) {
  return {
    id: 'order-1',
    orderStatus,
    items: [],
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
