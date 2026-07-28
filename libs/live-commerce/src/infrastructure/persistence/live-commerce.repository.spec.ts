import { LiveCommerceRepository } from './live-commerce.repository';

describe('LiveCommerceRepository', () => {
  it('locks the session while transitioning and snapshots reminder recipients', async () => {
    const startedAt = new Date('2026-07-28T05:00:00.000Z');
    const connectedSession = {
      id: 'live-1',
      status: 'LIVE',
      providerStatus: 'CONNECTED',
    };
    let lockSql = '';
    const transaction = {
      $queryRaw: jest.fn((strings: TemplateStringsArray) => {
        lockSql = strings.join('');
        return Promise.resolve([{ id: 'live-1' }]);
      }),
      liveCommerceSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(connectedSession),
      },
      liveSessionReminder: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ userId: 'buyer-1' }, { userId: 'buyer-2' }]),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const repository = new LiveCommerceRepository(prisma as never);

    await expect(
      repository.markLiveSessionLive({
        sessionId: 'live-1',
        requesterUserId: 'seller-1',
        startedAt,
      }),
    ).resolves.toEqual({
      startedNow: false,
      session: connectedSession,
      reminderUserIds: ['buyer-1', 'buyer-2'],
    });
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(lockSql).toContain('FOR UPDATE');
    expect(transaction.liveCommerceSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'live-1',
        status: 'SCHEDULED',
        streamProvider: 'AGORA_RTC',
      },
      data: {
        status: 'LIVE',
        providerStatus: 'CONNECTED',
        actualStartedAt: startedAt,
        providerEventAt: startedAt,
        providerEventType: 'agora.publisher.started',
        providerErrorCode: null,
        providerErrorMessage: null,
      },
    });
  });

  it('does not insert a reminder after the locked session has left SCHEDULED', async () => {
    const liveSession = { id: 'live-1', status: 'LIVE' };
    let lockSql = '';
    const transaction = {
      $queryRaw: jest.fn((strings: TemplateStringsArray) => {
        lockSql = strings.join('');
        return Promise.resolve([{ id: 'live-1', status: 'LIVE' }]);
      }),
      liveSessionReminder: {
        upsert: jest.fn(),
      },
      liveCommerceSession: {
        findUnique: jest.fn().mockResolvedValue(liveSession),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const repository = new LiveCommerceRepository(prisma as never);

    await expect(
      repository.remindLiveSession({
        sessionId: 'live-1',
        userId: 'buyer-1',
      }),
    ).resolves.toBe(liveSession);

    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(lockSql).toContain('FOR UPDATE');
    expect(transaction.liveSessionReminder.upsert).not.toHaveBeenCalled();
  });
});
