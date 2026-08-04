import {
  createRequestPerformanceContext,
  getRequestPerformanceContext,
  measureServiceCall,
  runRequestPerformanceContext,
} from './request-context';

describe('request performance context', () => {
  it('tracks database query count and duration within the request scope', () => {
    const context = createRequestPerformanceContext('request-1', 1000);

    runRequestPerformanceContext(context, () => {
      getRequestPerformanceContext()?.recordQuery(12.5);
      getRequestPerformanceContext()?.recordQuery(7.5);
      getRequestPerformanceContext()?.recordServiceCall(30, false);
      getRequestPerformanceContext()?.recordServiceCall(4, true);
    });

    expect(context.queryCount).toBe(2);
    expect(context.dbDurationMs).toBe(20);
    expect(context.serviceCallCount).toBe(2);
    expect(context.serviceDurationMs).toBe(34);
    expect(context.serviceErrorCount).toBe(1);
    expect(getRequestPerformanceContext()).toBeUndefined();
  });

  it('records successful and failed service calls', async () => {
    const context = createRequestPerformanceContext('request-2');

    await runRequestPerformanceContext(context, async () => {
      await measureServiceCall(async () => 'ok');
      await expect(
        measureServiceCall(async () => Promise.reject(new Error('downstream'))),
      ).rejects.toThrow('downstream');
    });

    expect(context.serviceCallCount).toBe(2);
    expect(context.serviceErrorCount).toBe(1);
  });
});
