import { AffiliateSettlementWorker } from './affiliate-settlement.worker';

describe('AffiliateSettlementWorker', () => {
  afterEach(() => jest.restoreAllMocks());

  it('falls back to one hour instead of creating a tight loop for an invalid interval', () => {
    let scheduledInterval = 0;
    jest.spyOn(global, 'setInterval').mockImplementation(((_callback: () => void, timeout: number) => {
      scheduledInterval = timeout;
      return { unref: jest.fn() };
    }) as typeof setInterval);
    const worker = new AffiliateSettlementWorker(
      { get: jest.fn().mockReturnValue('not-a-number') } as never,
      { execute: jest.fn().mockResolvedValue({ scanned: 0, paid: 0, failed: 0 }) } as never,
    );

    worker.onApplicationBootstrap();

    expect(scheduledInterval).toBe(3_600_000);
  });
});
