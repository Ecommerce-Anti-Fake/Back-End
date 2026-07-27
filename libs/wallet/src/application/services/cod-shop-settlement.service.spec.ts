import { Prisma } from '@prisma/client';
import { CodShopSettlementService } from './cod-shop-settlement.service';

describe('CodShopSettlementService', () => {
  const now = new Date('2026-07-27T06:00:00.000Z');
  const group = {
    id: 'group-1',
    orderId: 'order-1',
    shopId: 'shop-1',
    platformFeeAmount: new Prisma.Decimal('20000'),
    refundAllocations: [],
    shop: { ownerUserId: 'owner-1', shopName: 'Shop A' },
    order: {
      paymentIntent: { paymentMethod: 'COD' },
      affiliateConversion: {
        id: 'conversion-1',
        conversionStatus: 'PENDING',
        program: {
          ownerShopId: 'shop-1',
          settlementMode: 'AUTOMATIC',
          commissionHoldDays: 7,
        },
        commissionEntries: [
          { id: 'commission-1', amount: new Prisma.Decimal('5000') },
        ],
      },
    },
  };
  const tx = {
    orderShopGroup: { findUnique: jest.fn() },
    codShopSettlement: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    affiliateConversion: { update: jest.fn() },
    affiliateCommissionLedger: { updateMany: jest.fn() },
    notification: { upsert: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    codShopSettlement: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const walletRepository = {
    findOrCreateShopWalletInTransaction: jest.fn(),
    findOrCreatePlatformWalletInTransaction: jest.fn(),
    executeTransactionInTransaction: jest.fn(),
  };
  const config = {
    get: jest.fn((name: string) => ({
      COD_SHOP_SETTLEMENT_ENABLED: 'true',
      COD_DEBT_GRACE_HOURS: '72',
    })[name]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now.getTime());
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    tx.orderShopGroup.findUnique.mockResolvedValue(group);
    tx.codShopSettlement.findUnique.mockResolvedValue(null);
    tx.codShopSettlement.upsert.mockImplementation(
      ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({
        id: 'settlement-1',
        status: 'PENDING',
        ...create,
        ...update,
      }),
    );
    tx.codShopSettlement.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: 'settlement-1',
        orderId: 'order-1',
        orderShopGroupId: 'group-1',
        platformFeeAmount: new Prisma.Decimal('20000'),
        affiliateAmount: new Prisma.Decimal('5000'),
        obligationAmount: new Prisma.Decimal('25000'),
        settledAmount: new Prisma.Decimal(0),
        status: 'PENDING',
        dueAt: null,
        settledAt: null,
        createdAt: now,
        ...data,
      }),
    );
    walletRepository.findOrCreateShopWalletInTransaction.mockResolvedValue({
      id: 'wallet-shop-1',
      availableBalance: new Prisma.Decimal('100000'),
    });
    walletRepository.findOrCreatePlatformWalletInTransaction.mockResolvedValue({
      id: 'wallet-platform-revenue',
    });
  });

  afterEach(() => jest.useRealTimers());

  it('collects platform fee and automatic affiliate reserve when balance is enough', async () => {
    const service = new CodShopSettlementService(
      prisma as never,
      walletRepository as never,
      config as never,
    );

    await expect(service.activate({
      orderShopGroupId: 'group-1',
      actorUserId: 'owner-1',
    })).resolves.toMatchObject({
      status: 'SETTLED',
      obligationAmount: '25000.00',
    });

    expect(walletRepository.executeTransactionInTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        transactionType: 'SETTLEMENT',
        idempotencyKey: 'COD_SETTLEMENT:group-1:COLLECT',
        amount: new Prisma.Decimal('25000'),
        entries: [
          expect.objectContaining({
            walletId: 'wallet-shop-1',
            direction: 'DEBIT',
            balanceType: 'AVAILABLE',
            amount: new Prisma.Decimal('25000'),
          }),
          expect.objectContaining({
            walletId: 'wallet-platform-revenue',
            direction: 'CREDIT',
            balanceType: 'AVAILABLE',
            amount: new Prisma.Decimal('20000'),
          }),
          expect.objectContaining({
            walletId: 'wallet-shop-1',
            direction: 'CREDIT',
            balanceType: 'LOCKED',
            amount: new Prisma.Decimal('5000'),
          }),
        ],
      }),
    );
    expect(tx.codShopSettlement.update).toHaveBeenCalledWith({
      where: { id: 'settlement-1' },
      data: expect.objectContaining({
        status: 'SETTLED',
        settledAmount: new Prisma.Decimal('25000'),
        settledAt: now,
      }),
    });
    expect(tx.affiliateCommissionLedger.updateMany).toHaveBeenCalledWith({
      where: { conversionId: 'conversion-1', commissionStatus: 'PENDING' },
      data: {
        commissionStatus: 'LOCKED',
        lockedAt: now,
        availableAt: new Date('2026-08-03T06:00:00.000Z'),
      },
    });
  });

  it('creates a 72-hour outstanding obligation without blocking order completion', async () => {
    walletRepository.findOrCreateShopWalletInTransaction.mockResolvedValueOnce({
      id: 'wallet-shop-1',
      availableBalance: new Prisma.Decimal('10000'),
    });
    tx.codShopSettlement.update.mockResolvedValue({
      id: 'settlement-1',
      status: 'OUTSTANDING',
      obligationAmount: new Prisma.Decimal('25000'),
      dueAt: new Date('2026-07-30T06:00:00.000Z'),
    });
    const service = new CodShopSettlementService(
      prisma as never,
      walletRepository as never,
      config as never,
    );

    await expect(service.activate({
      orderShopGroupId: 'group-1',
      actorUserId: 'owner-1',
    })).resolves.toMatchObject({
      status: 'OUTSTANDING',
      obligationAmount: '25000.00',
      requiredTopUpAmount: '15000.00',
      dueAt: new Date('2026-07-30T06:00:00.000Z'),
    });

    expect(walletRepository.executeTransactionInTransaction).not.toHaveBeenCalled();
    expect(tx.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { dedupeKey: 'COD_DEBT:group-1:owner-1' },
    }));
  });

  it('rejects new orders only after an outstanding COD debt is overdue', async () => {
    tx.codShopSettlement.findFirst.mockResolvedValueOnce({
      id: 'settlement-1',
      shopId: 'shop-1',
      dueAt: new Date('2026-07-27T05:59:59.000Z'),
      shop: { shopName: 'Shop A' },
    });
    const service = new CodShopSettlementService(
      prisma as never,
      walletRepository as never,
      config as never,
    );

    await expect(service.assertShopsCanReceiveOrdersInTransaction(
      tx as never,
      ['shop-1'],
      now,
    )).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SHOP_COD_DEBT_OVERDUE' }),
    });
  });

  it('does not skip an older unpaid COD debt to settle a newer one', async () => {
    tx.codShopSettlement.findMany.mockResolvedValueOnce([
      { orderShopGroupId: 'group-old' },
      { orderShopGroupId: 'group-new' },
    ]);
    const service = new CodShopSettlementService(
      prisma as never,
      walletRepository as never,
      config as never,
    );
    const activate = jest
      .spyOn(service as any, 'activateInTransaction')
      .mockResolvedValueOnce({ status: 'OUTSTANDING' });

    await service.settleOutstandingForWalletInTransaction(tx as never, 'wallet-shop-1');

    expect(activate).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledWith(tx, 'group-old');
  });
});
