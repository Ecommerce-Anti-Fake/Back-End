import { Prisma } from '@prisma/client';
import { ReleaseEscrowUseCase } from './release-escrow.use-case';

describe('ReleaseEscrowUseCase', () => {
  const tx = {
    order: { findUnique: jest.fn() },
    escrow: { update: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const walletRepository = {
    findOrCreatePlatformWalletInTransaction: jest.fn(),
    findOrCreateShopWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };

  let useCase: ReleaseEscrowUseCase;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    useCase = new ReleaseEscrowUseCase(prisma as never, walletRepository as never);
    walletRepository.findOrCreatePlatformWalletInTransaction
      .mockResolvedValueOnce({ id: 'escrow-wallet' })
      .mockResolvedValueOnce({ id: 'revenue-wallet' });
    walletRepository.findOrCreateShopWalletInTransaction.mockResolvedValue({ id: 'shop-wallet' });
    tx.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderStatus: 'paid',
      buyerPayableAmount: new Prisma.Decimal('100'),
      platformFeeAmount: new Prisma.Decimal('20'),
      sellerReceivableAmount: new Prisma.Decimal('80'),
      escrow: { id: 'escrow-1', escrowStatus: 'HELD' },
      shop: { id: 'shop-1' },
    });
  });

  it('moves escrow to shop pending and platform revenue atomically', async () => {
    await useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' });

    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        transactionCode: 'ESCROW_RELEASE:order-1',
        transactionType: 'ESCROW_RELEASE',
        idempotencyKey: 'ORDER:order-1:ESCROW_RELEASE',
        amount: new Prisma.Decimal('100'),
        entries: expect.arrayContaining([
          expect.objectContaining({ walletId: 'escrow-wallet', direction: 'DEBIT', balanceType: 'PENDING', amount: new Prisma.Decimal('100') }),
          expect.objectContaining({ walletId: 'shop-wallet', direction: 'CREDIT', balanceType: 'PENDING', amount: new Prisma.Decimal('80') }),
          expect.objectContaining({ walletId: 'revenue-wallet', direction: 'CREDIT', balanceType: 'AVAILABLE', amount: new Prisma.Decimal('20') }),
        ]),
      }),
    );
    expect(tx.escrow.update).toHaveBeenCalledWith({
      where: { id: 'escrow-1' },
      data: expect.objectContaining({ escrowStatus: 'RELEASED', releaseAt: expect.any(Date) }),
    });
  });

  it('rejects unpaid orders and non-held escrow', async () => {
    tx.order.findUnique.mockResolvedValueOnce({ orderStatus: 'pending', escrow: { escrowStatus: 'HELD' } });
    await expect(useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' })).rejects.toThrow('Only paid orders can release escrow');

    tx.order.findUnique.mockResolvedValueOnce({ orderStatus: 'paid', escrow: { escrowStatus: 'RELEASED' } });
    await expect(useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' })).rejects.toThrow('Escrow is not held');
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });
});
