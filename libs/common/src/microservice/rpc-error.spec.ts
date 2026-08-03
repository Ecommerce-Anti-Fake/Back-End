/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ForbiddenException, HttpException } from '@nestjs/common';
import { throwHttpExceptionFromRpc, toVietnameseMessage } from './rpc-error';

describe('toVietnameseMessage', () => {
  it('identifies the invalid field for class-validator errors', () => {
    expect(toVietnameseMessage(['phone must be a string'])).toEqual([
      'Số điện thoại: không được để trống và phải là chuỗi.',
    ]);
  });

  it('keeps multiple validation fields visible', () => {
    expect(
      toVietnameseMessage([
        'shopName must be longer than or equal to 3 characters',
        'categoryIds must be an array',
      ]),
    ).toEqual([
      'Tên shop: phải có ít nhất 3 ký tự.',
      'Danh mục sản phẩm: phải là danh sách.',
    ]);
  });

  it('preserves pending registration details across the RPC boundary', () => {
    let thrown: unknown;
    try {
      throwHttpExceptionFromRpc(
        new ForbiddenException({
          statusCode: 403,
          error: 'ACCOUNT_VERIFICATION_REQUIRED',
          message: 'Verify account',
          registration: {
            provider: 'LOCAL',
            email: 'user@example.com',
            phone: '+84901234567',
            expiresAt: '2026-08-04T00:00:00.000Z',
          },
        }),
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getResponse()).toEqual(
      expect.objectContaining({
        registration: expect.objectContaining({ email: 'user@example.com' }),
      }),
    );
  });
});
