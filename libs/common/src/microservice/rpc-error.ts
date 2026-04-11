import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

type RpcErrorPayload = {
  statusCode: number;
  message: string | string[];
  error?: string;
};

export function throwRpcException(error: unknown): never {
  if (error instanceof RpcException) {
    throw error;
  }

  if (error instanceof HttpException) {
    const response = error.getResponse();
    const payload =
      typeof response === 'string'
        ? {
            statusCode: error.getStatus(),
            message: response,
            error: error.name,
          }
        : {
            statusCode: error.getStatus(),
            message: extractMessage(response, error.message),
            error: extractErrorName(response, error.name),
          };

    throw new RpcException(payload);
  }

  throw new RpcException({
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: error instanceof Error ? error.message : 'Internal server error',
    error: 'InternalServerError',
  });
}

export function throwHttpExceptionFromRpc(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  const payload = normalizeRpcError(error);
  throw new HttpException(payload, payload.statusCode);
}

function normalizeRpcError(error: unknown): RpcErrorPayload {
  if (isRpcErrorPayload(error)) {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    isRpcErrorPayload((error as { error?: unknown }).error)
  ) {
    return (error as { error: RpcErrorPayload }).error;
  }

  const fallback = new InternalServerErrorException('Unexpected RPC error');
  return {
    statusCode: fallback.getStatus(),
    message: fallback.message,
    error: fallback.name,
  };
}

function isRpcErrorPayload(value: unknown): value is RpcErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'statusCode' in value &&
    typeof (value as { statusCode?: unknown }).statusCode === 'number' &&
    'message' in value
  );
}

function extractMessage(response: object, fallback: string): string | string[] {
  const message = (response as { message?: unknown }).message;
  if (typeof message === 'string' || Array.isArray(message)) {
    return message;
  }

  return fallback;
}

function extractErrorName(response: object, fallback: string): string {
  const error = (response as { error?: unknown }).error;
  return typeof error === 'string' ? error : fallback;
}
