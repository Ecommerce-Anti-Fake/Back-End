import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  createRequestPerformanceContext,
  runRequestPerformanceContext,
} from '@common/performance/request-context';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = Date.now();
    const requestId = this.requestId(request);
    const performanceContext = createRequestPerformanceContext(requestId, startedAt);

    response.setHeader('x-request-id', requestId);
    (request as Request & { requestId?: string }).requestId = requestId;

    response.on('finish', () => {
      const statusCode = response.statusCode;
      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';

      this.logger[level](
        JSON.stringify({
          event: 'http.request',
          requestId,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode,
          durationMs: Date.now() - startedAt,
          queryCount: performanceContext.queryCount,
          dbDurationMs: roundDuration(performanceContext.dbDurationMs),
          serviceCallCount: performanceContext.serviceCallCount,
          serviceDurationMs: roundDuration(performanceContext.serviceDurationMs),
          serviceErrorCount: performanceContext.serviceErrorCount,
          payloadBytes: responsePayloadBytes(response),
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        }),
      );
    });

    runRequestPerformanceContext(performanceContext, next);
  }

  private requestId(request: Request) {
    const header = request.headers['x-request-id'];
    const value = Array.isArray(header) ? header[0] : header;

    return value && value.trim().length > 0 ? value.trim() : randomUUID();
  }
}

function responsePayloadBytes(response: Response) {
  const value = response.getHeader('content-length');
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function roundDuration(value: number) {
  return Math.round(value * 100) / 100;
}
