import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = Date.now();
    const requestId = this.requestId(request);

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
          ip: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        }),
      );
    });

    next();
  }

  private requestId(request: Request) {
    const header = request.headers['x-request-id'];
    const value = Array.isArray(header) ? header[0] : header;

    return value && value.trim().length > 0 ? value.trim() : randomUUID();
  }
}
