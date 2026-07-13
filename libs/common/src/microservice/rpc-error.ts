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
            message: toVietnameseMessage(extractMessage(response, error.message)),
            error: extractErrorName(response, error.name),
          };

    throw new RpcException(payload);
  }

  throw new RpcException({
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: toVietnameseMessage(error instanceof Error ? error.message : 'Internal server error'),
    error: 'InternalServerError',
  });
}

function toVietnameseMessage(message: string | string[]): string | string[] {
  if (Array.isArray(message)) return message.map((item) => toVietnameseMessage(item) as string);
  const mappings: Record<string, string> = {
    ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
    ORDER_ALREADY_PAID: 'Đơn hàng đã được thanh toán.',
    INSUFFICIENT_BALANCE: 'Số dư ví không đủ để thanh toán đơn hàng.',
    WALLET_FROZEN: 'Ví hiện đang bị khóa.',
    INVALID_ORDER_STATUS: 'Trạng thái đơn hàng không cho phép thực hiện thao tác này.',
    ORDER_NOT_OWNED: 'Bạn không có quyền thao tác với đơn hàng này.',
    ESCROW_ALREADY_REFUNDED: 'Đơn hàng đã được hoàn tiền trước đó.',
    ESCROW_ALREADY_RELEASED: 'Tiền của đơn hàng đã được đối soát cho shop và không thể hoàn theo luồng này.',
    PAYMENT_FAILED: 'Thanh toán không thành công. Vui lòng thử lại.',
    REFUND_FAILED: 'Hoàn tiền không thành công. Vui lòng thử lại.',
  };
  return mappings[message] ?? message;
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
