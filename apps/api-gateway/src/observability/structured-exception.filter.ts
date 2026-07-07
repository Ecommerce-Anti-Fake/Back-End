import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class StructuredExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(StructuredExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { requestId?: string }>();
    const response = context.getResponse<Response>();
    const statusCode = this.statusCode(exception);
    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : statusCode === HttpStatus.PAYLOAD_TOO_LARGE
          ? { message: 'Request payload too large' }
          : { message: 'Internal server error' };
    const message =
      typeof payload === 'string'
        ? payload
        : typeof payload === 'object' && payload !== null && 'message' in payload
          ? (payload as { message: unknown }).message
          : 'Internal server error';

    const logPayload = JSON.stringify({
      event: 'http.error',
      requestId: request.requestId ?? null,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      message,
      errorName: exception instanceof Error ? exception.name : 'UnknownError',
    });
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logPayload, stack);
    } else {
      this.logger.warn(logPayload);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      requestId: request.requestId ?? null,
    });
  }

  private statusCode(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      (exception as { status?: unknown }).status === HttpStatus.PAYLOAD_TOO_LARGE
    ) {
      return HttpStatus.PAYLOAD_TOO_LARGE;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
