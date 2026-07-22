import { Prisma } from '@prisma/client';
import { ReleaseEscrowUseCase } from './release-escrow.use-case';

describe('ReleaseEscrowUseCase', () => {
  const tx = {
    order: { findUnique: jest.fn() },
    escrow: { update: jest.fn() },
    affiliateConversion: { update: jest.fn() },
    affiliateCommissionLedger: { updateMany: jest.fn() },
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
      shopGroups: [],
      affiliateConversion: null,
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
    const entries = walletRepository.executeTransactionInTransaction.mock.calls[0][1].entries;
    const debit = entries.filter((entry: { direction: string }) => entry.direction === 'DEBIT')
      .reduce((total: Prisma.Decimal, entry: { amount: Prisma.Decimal }) => total.plus(entry.amount), new Prisma.Decimal(0));
    const credit = entries.filter((entry: { direction: string }) => entry.direction === 'CREDIT')
      .reduce((total: Prisma.Decimal, entry: { amount: Prisma.Decimal }) => total.plus(entry.amount), new Prisma.Decimal(0));
    expect(debit.equals(credit)).toBe(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reserves automatic affiliate commission in the funding shop locked balance', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-22T10:00:00.000Z').getTime());
    tx.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      orderStatus: 'paid',
      buyerPayableAmount: new Prisma.Decimal('100'),
      platformFeeAmount: new Prisma.Decimal('20'),
      sellerReceivableAmount: new Prisma.Decimal('80'),
      escrow: { id: 'escrow-1', escrowStatus: 'HELD' },
      shop: { id: 'shop-1' },
      shopGroups: [{ shopId: 'shop-1', sellerReceivableAmount: new Prisma.Decimal('80') }],
      affiliateConversion: {
        id: 'conversion-1',
        conversionStatus: 'PENDING',
        program: { ownerShopId: 'shop-1', settlementMode: 'AUTOMATIC', commissionHoldDays: 7 },
        commissionEntries: [
          { id: 'commission-1', amount: new Prisma.Decimal('6'), commissionStatus: 'PENDING' },
          { id: 'commission-2', amount: new Prisma.Decimal('2'), commissionStatus: 'PENDING' },
        ],
      },
    });

    await useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' });

    const entries = walletRepository.executeTransactionInTransaction.mock.calls[0][1].entries;
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ walletId: 'shop-wallet', balanceType: 'PENDING', amount: new Prisma.Decimal('72') }),
      expect.objectContaining({ walletId: 'shop-wallet', balanceType: 'LOCKED', amount: new Prisma.Decimal('8') }),
    ]));
    expect(tx.affiliateConversion.update).toHaveBeenCalledWith({
      where: { id: 'conversion-1' },
      data: { conversionStatus: 'APPROVED', approvedAt: new Date('2026-07-22T10:00:00.000Z') },
    });
    expect(tx.affiliateCommissionLedger.updateMany).toHaveBeenCalledWith({
      where: { conversionId: 'conversion-1', commissionStatus: 'PENDING' },
      data: {
        commissionStatus: 'LOCKED',
        lockedAt: new Date('2026-07-22T10:00:00.000Z'),
        availableAt: new Date('2026-07-29T10:00:00.000Z'),
      },
    });
  });

  it('does not revive a conversion cancelled by a full pre-release refund', async () => {
    tx.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      orderStatus: 'paid',
      buyerPayableAmount: new Prisma.Decimal('100'),
      platformFeeAmount: new Prisma.Decimal('20'),
      sellerReceivableAmount: new Prisma.Decimal('80'),
      escrow: { id: 'escrow-1', escrowStatus: 'HELD' },
      shop: { id: 'shop-1' },
      shopGroups: [{ shopId: 'shop-1', sellerReceivableAmount: new Prisma.Decimal('80') }],
      affiliateConversion: {
        id: 'conversion-1',
        conversionStatus: 'CANCELLED',
        program: { ownerShopId: 'shop-1', settlementMode: 'AUTOMATIC', commissionHoldDays: 7 },
        commissionEntries: [],
      },
    });

    await useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' });

    expect(tx.affiliateConversion.update).not.toHaveBeenCalled();
    expect(tx.affiliateCommissionLedger.updateMany).not.toHaveBeenCalled();
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entries: expect.arrayContaining([
          expect.objectContaining({ balanceType: 'PENDING', amount: new Prisma.Decimal('80') }),
        ]),
      }),
    );
  });

  it('rejects unpaid orders and non-held escrow', async () => {
    tx.order.findUnique.mockResolvedValueOnce({ orderStatus: 'pending', escrow: { escrowStatus: 'HELD' } });
    await expect(useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' })).rejects.toThrow('Only paid orders can release escrow');

    tx.order.findUnique.mockResolvedValueOnce({ orderStatus: 'paid', escrow: { escrowStatus: 'RELEASED' } });
    await expect(useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' })).rejects.toThrow('Escrow is not held');
    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
  });

  it('does not release the same escrow twice', async () => {
    const useCase = new ReleaseEscrowUseCase(prisma as never, walletRepository as never);
    await useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' });
    tx.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      orderStatus: 'paid',
      escrow: { id: 'escrow-1', escrowStatus: 'RELEASED' },
      shop: { id: 'shop-1' },
    });

    await expect(useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' })).rejects.toThrow('Escrow is not held');
    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back escrow update when wallet settlement fails', async () => {
    walletRepository.executeTransactionInTransaction.mockRejectedValueOnce(new Error('wallet failure'));
    await expect(useCase.execute({ orderId: 'order-1', actorUserId: 'seller-1' })).rejects.toThrow('wallet failure');
    expect(tx.escrow.update).not.toHaveBeenCalled();
  });
});
