import { Prisma } from '@prisma/client';
import { WalletTopUpLifecycleService } from './wallet-top-up-lifecycle.service';

describe('WalletTopUpLifecycleService', () => {
  function fixture(expiresAt: Date | null = new Date(Date.now() + 600000)) {
    const row = {
      id: 'top-up-1',
      paymentLinkId: 'link-1',
      checkoutUrl: 'https://pay.payos.vn/web/link-1',
      amount: new Prisma.Decimal(10000),
      currency: 'VND',
      status: 'PENDING',
      expiresAt,
      qrCode: 'official-emv',
    };
    const prisma = {
      walletTopUp: {
        findMany: jest.fn().mockResolvedValue([row]),
        findUniqueOrThrow: jest.fn().mockResolvedValue(row),
        updateMany: jest.fn(),
      },
    };
    const handler = {
      findOwned: jest.fn().mockResolvedValue(row),
      assertAccess: jest.fn(),
      reconcileRecord: jest.fn(),
    };
    return {
      row,
      prisma,
      handler,
      service: new WalletTopUpLifecycleService(
        prisma as never,
        handler as never,
      ),
    };
  }
  it('resumes the same link with persisted expiry and no creation call', async () => {
    const f = fixture();
    const first = await f.service.resume({
      userId: 'user-1',
      paymentLinkId: 'link-1',
    });
    const second = await f.service.resume({
      userId: 'user-1',
      paymentLinkId: 'link-1',
    });
    expect(first.paymentLinkId).toBe('link-1');
    expect(second.expiresAt).toBe(first.expiresAt);
    expect(first.qrCode).toBe('official-emv');
    expect(first.canResume).toBe(true);
  });
  it('does not reopen a historical link without a verified expiry', async () => {
    const f = fixture(null);
    expect(
      await f.service.resume({ userId: 'user-1', paymentLinkId: 'link-1' }),
    ).toMatchObject({ checkoutUrl: null, qrCode: null, canResume: false });
  });
  it.each(['PAID', 'CANCELLED', 'EXPIRED'])(
    'hides checkout data for %s',
    async (status) => {
      const f = fixture();
      f.row.status = status;
      expect(
        await f.service.resume({ userId: 'user-1', paymentLinkId: 'link-1' }),
      ).toMatchObject({
        status,
        checkoutUrl: null,
        qrCode: null,
        canResume: false,
      });
    },
  );
  it('hides expired QR even before provider background reconciliation runs', async () => {
    const f = fixture(new Date(Date.now() - 1000));
    expect(await f.service.list({ userId: 'user-1' })).toEqual([
      expect.objectContaining({
        status: 'EXPIRED',
        checkoutUrl: null,
        qrCode: null,
        canResume: false,
      }),
    ]);
  });
  it('calls provider cancellation only through ownership-checked reconciliation', async () => {
    const f = fixture();
    await f.service.resume(
      { userId: 'owner', shopId: 'shop-1', paymentLinkId: 'link-1' },
      true,
    );
    expect(f.handler.findOwned).toHaveBeenCalledWith({
      userId: 'owner',
      shopId: 'shop-1',
      paymentLinkId: 'link-1',
    });
    expect(f.handler.reconcileRecord).toHaveBeenCalledWith(f.row, true);
  });
  it('denies shop listing before querying records', async () => {
    const f = fixture();
    f.handler.assertAccess.mockRejectedValue(new Error('forbidden'));
    await expect(
      f.service.list({ userId: 'attacker', shopId: 'shop-1' }),
    ).rejects.toThrow('forbidden');
    expect(f.prisma.walletTopUp.findMany).not.toHaveBeenCalled();
  });
  it('background reconciliation excludes historical rows and operates without frontend', async () => {
    const f = fixture();
    await f.service.reconcileDue();
    expect(f.prisma.walletTopUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({ expiresAt: { not: null } }),
      }),
    );
    expect(f.handler.reconcileRecord).toHaveBeenCalledWith(f.row);
  });
  it('rotates failed provider checks so they do not starve later managed rows', async () => {
    const f = fixture();
    f.handler.reconcileRecord.mockRejectedValue(
      new Error('provider unavailable'),
    );
    await f.service.reconcileDue();
    expect(f.prisma.walletTopUp.updateMany).toHaveBeenCalledWith({
      where: { id: 'top-up-1', status: { not: 'PAID' } },
      data: { lastReconciledAt: expect.any(Date) as unknown },
    });
  });
});
