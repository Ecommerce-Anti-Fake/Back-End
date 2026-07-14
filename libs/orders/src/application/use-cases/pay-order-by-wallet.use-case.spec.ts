import { Prisma } from '@prisma/client';
import { PayOrderByWalletUseCase } from './pay-order-by-wallet.use-case';

describe('PayOrderByWalletUseCase', () => {
  const prisma = { $transaction: jest.fn() };
  const walletRepository = {
    findOrCreateUserWalletInTransaction: jest.fn(),
    findOrCreatePlatformWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };
  let useCase: PayOrderByWalletUseCase;
  let order: any;
  const tx = {
    order: { findUnique: jest.fn(), update: jest.fn() },
    paymentIntent: { update: jest.fn() },
    escrow: { update: jest.fn() },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useCase = new PayOrderByWalletUseCase(prisma as never, walletRepository as never);
    order = {
      id: 'order-1', buyerUserId: 'buyer-1', orderStatus: 'pending',
      buyerPayableAmount: new Prisma.Decimal('100.10'),
      paymentIntent: { id: 'payment-1', paymentStatus: 'PENDING', paymentMethod: 'PAYOS' },
      escrow: { id: 'escrow-1', escrowStatus: 'PENDING' },
    };
    tx.order.findUnique.mockResolvedValue(order);
    tx.order.update.mockResolvedValue({ ...order, orderStatus: 'paid' });
    walletRepository.findOrCreateUserWalletInTransaction.mockResolvedValue({ id: 'user-wallet' });
    walletRepository.findOrCreatePlatformWalletInTransaction.mockResolvedValue({ id: 'escrow-wallet' });
    walletRepository.executeTransactionInTransaction.mockResolvedValue({ id: 'ledger-1' });
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));
  });

  it('debits user, credits escrow, and marks payment held atomically', async () => {
    await useCase.execute({ orderId: 'order-1', requesterUserId: 'buyer-1', amount: new Prisma.Decimal('100.10') });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      transactionType: 'ESCROW_HOLD', idempotencyKey: 'ORDER:order-1:WALLET_PAYMENT',
      entries: expect.arrayContaining([
        expect.objectContaining({ walletId: 'user-wallet', direction: 'DEBIT', balanceType: 'AVAILABLE' }),
        expect.objectContaining({ walletId: 'escrow-wallet', direction: 'CREDIT', balanceType: 'PENDING' }),
      ]),
    }));
    expect(tx.paymentIntent.update).toHaveBeenCalledWith(expect.objectContaining({ data: { paymentMethod: 'WALLET', paymentStatus: 'PAID' } }));
    expect(tx.escrow.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ escrowStatus: 'HELD', heldAmount: new Prisma.Decimal('100.10') }) }));
  });

  it('rolls back when the ledger rejects insufficient balance', async () => {
    walletRepository.executeTransactionInTransaction.mockRejectedValueOnce(new Error('INSUFFICIENT_BALANCE'));
    await expect(useCase.execute({ orderId: 'order-1', requesterUserId: 'buyer-1', amount: 100.10 })).rejects.toThrow('INSUFFICIENT_BALANCE');
    expect(tx.paymentIntent.update).not.toHaveBeenCalled();
    expect(tx.escrow.update).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('does not pay an already paid order again', async () => {
    order.paymentIntent = { ...order.paymentIntent, paymentMethod: 'WALLET', paymentStatus: 'PAID' };
    await useCase.execute({ orderId: 'order-1', requesterUserId: 'buyer-1', amount: 100.10 });
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('uses the stable order idempotency key for retries', async () => {
    await useCase.execute({ orderId: 'order-1', requesterUserId: 'buyer-1', amount: 100.10 });
    await useCase.execute({ orderId: 'order-1', requesterUserId: 'buyer-1', amount: 100.10 });
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledTimes(2);
    expect(walletRepository.executeTransactionInTransaction.mock.calls[0][1].idempotencyKey)
      .toBe(walletRepository.executeTransactionInTransaction.mock.calls[1][1].idempotencyKey);
  });
});
