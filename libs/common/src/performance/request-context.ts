import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestPerformanceContext = {
  requestId: string;
  startedAt: number;
  queryCount: number;
  dbDurationMs: number;
  serviceCallCount: number;
  serviceDurationMs: number;
  serviceErrorCount: number;
  recordQuery: (durationMs: number) => void;
  recordServiceCall: (durationMs: number, failed: boolean) => void;
};

const requestPerformanceStorage =
  new AsyncLocalStorage<RequestPerformanceContext>();

export function createRequestPerformanceContext(
  requestId: string,
  startedAt = Date.now(),
) {
  const context: RequestPerformanceContext = {
    requestId,
    startedAt,
    queryCount: 0,
    dbDurationMs: 0,
    serviceCallCount: 0,
    serviceDurationMs: 0,
    serviceErrorCount: 0,
    recordQuery(durationMs) {
      context.queryCount += 1;
      context.dbDurationMs += durationMs;
    },
    recordServiceCall(durationMs, failed) {
      context.serviceCallCount += 1;
      context.serviceDurationMs += durationMs;
      if (failed) {
        context.serviceErrorCount += 1;
      }
    },
  };

  return context;
}

export function runRequestPerformanceContext<T>(
  context: RequestPerformanceContext,
  callback: () => T,
) {
  return requestPerformanceStorage.run(context, callback);
}

export function getRequestPerformanceContext() {
  return requestPerformanceStorage.getStore();
}

export async function measureServiceCall<T>(callback: () => Promise<T>) {
  const startedAt = Date.now();
  let failed = false;

  try {
    return await callback();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    getRequestPerformanceContext()?.recordServiceCall(
      Date.now() - startedAt,
      failed,
    );
  }
}
