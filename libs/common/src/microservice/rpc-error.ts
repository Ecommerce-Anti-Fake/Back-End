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
  registration?: unknown;
};

export function throwRpcException(error: unknown): never {
  if (error instanceof RpcException) {
    throw error;
  }

  if (error instanceof HttpException) {
    const response = error.getResponse();
    const responseObject =
      typeof response === 'object' && response !== null
        ? (response as { registration?: unknown })
        : undefined;
    const payload =
      typeof response === 'string'
        ? {
            statusCode: error.getStatus(),
            message: toVietnameseMessage(response, error.getStatus()),
            error: error.name,
          }
        : {
            statusCode: error.getStatus(),
            message: toVietnameseMessage(
              extractMessage(response, error.message),
              error.getStatus(),
            ),
            error: extractErrorName(response, error.name),
            ...(responseObject && 'registration' in responseObject
              ? { registration: responseObject.registration }
              : {}),
          };

    throw new RpcException(payload);
  }

  throw new RpcException({
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: toVietnameseMessage(
      error instanceof Error ? error.message : 'Internal server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
    ),
    error: 'InternalServerError',
  });
}

export function toVietnameseMessage(
  message: string | string[],
  statusCode?: number,
): string | string[] {
  if (Array.isArray(message)) {
    return message.map(
      (item) => toVietnameseMessage(item, statusCode) as string,
    );
  }

  const validationMessage = toVietnameseValidationMessage(message);
  if (validationMessage) return validationMessage;

  const mappings: Record<string, string> = {
    ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
    ORDER_ALREADY_PAID: 'Đơn hàng đã được thanh toán.',
    INSUFFICIENT_BALANCE: 'Số dư ví không đủ để thanh toán đơn hàng.',
    WALLET_FROZEN: 'Ví hiện đang bị khóa.',
    INVALID_ORDER_STATUS:
      'Trạng thái đơn hàng không cho phép thực hiện thao tác này.',
    ORDER_NOT_OWNED: 'Bạn không có quyền thao tác với đơn hàng này.',
    ESCROW_ALREADY_REFUNDED: 'Đơn hàng đã được hoàn tiền trước đó.',
    ESCROW_ALREADY_RELEASED:
      'Tiền của đơn hàng đã được đối soát cho shop và không thể hoàn theo luồng này.',
    PAYMENT_FAILED: 'Thanh toán không thành công. Vui lòng thử lại.',
    REFUND_FAILED: 'Hoàn tiền không thành công. Vui lòng thử lại.',
    'Invalid credentials': 'Thông tin đăng nhập không hợp lệ.',
    'Invalid access token': 'Phiên đăng nhập không hợp lệ.',
    'Offer not found': 'Không tìm thấy offer.',
    'Order not found': 'Không tìm thấy đơn hàng.',
    'Shop not found': 'Không tìm thấy shop.',
    'Variant is required for this offer':
      'Vui lòng chọn variant cho offer này.',
    'Variant is not available': 'Variant không khả dụng.',
  };

  if (mappings[message]) return mappings[message];
  if (/[À-ỹ]/.test(message)) return message;
  if (statusCode === HttpStatus.UNAUTHORIZED)
    return 'Phiên đăng nhập không hợp lệ.';
  if (statusCode === HttpStatus.FORBIDDEN)
    return 'Bạn không có quyền thực hiện thao tác này.';
  if (statusCode === HttpStatus.NOT_FOUND)
    return 'Không tìm thấy dữ liệu yêu cầu.';
  if (statusCode === HttpStatus.CONFLICT)
    return 'Dữ liệu đã tồn tại hoặc đang xung đột.';
  if (statusCode && statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR))
    return 'Đã xảy ra lỗi máy chủ.';
  return 'Dữ liệu yêu cầu không hợp lệ.';
}

function toVietnameseValidationMessage(message: string): string | null {
  const match = message.match(
    /^(?<field>[A-Za-z][A-Za-z0-9_.-]*) (?<rule>must be a string|must be an array|must be a valid email|must be longer than or equal to (?<min>\d+) characters|must be shorter than or equal to (?<max>\d+) characters|should not be empty)$/,
  );

  if (!match?.groups) return null;

  const fieldLabels: Record<string, string> = {
    shopName: 'Tên shop',
    registrationType: 'Loại hình đăng ký',
    businessType: 'Loại hình kinh doanh',
    phone: 'Số điện thoại',
    taxCode: 'Mã số thuế',
    categoryIds: 'Danh mục sản phẩm',
  };
  const field = fieldLabels[match.groups.field] ?? match.groups.field;

  switch (match.groups.rule) {
    case 'must be a string':
      return `${field}: không được để trống và phải là chuỗi.`;
    case 'must be an array':
      return `${field}: phải là danh sách.`;
    case 'must be a valid email':
      return `${field}: phải là email hợp lệ.`;
    case 'should not be empty':
      return `${field}: không được để trống.`;
    default:
      if (match.groups.min)
        return `${field}: phải có ít nhất ${match.groups.min} ký tự.`;
      if (match.groups.max)
        return `${field}: không được vượt quá ${match.groups.max} ký tự.`;
      return `${field}: dữ liệu không hợp lệ.`;
  }
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

  const fallback = new InternalServerErrorException('Đã xảy ra lỗi máy chủ.');
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
