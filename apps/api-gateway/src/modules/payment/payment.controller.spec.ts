import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';

describe('PaymentController', () => {
  it('strips payOS return query params by redirecting to the frontend success route', () => {
    const controller = new PaymentController(
      {} as never,
      {} as never,
      {} as never,
      new ConfigService({
        FRONTEND_URL: 'https://antifake.io.vn',
      }),
    );
    const response = { redirect: jest.fn() };

    controller.handlePayOSReturn({} as never, response as never);

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://antifake.io.vn/payment-success',
    );
  });

  it('forwards only the provider return fields needed by the frontend', () => {
    const controller = new PaymentController(
      {} as never,
      {} as never,
      {} as never,
      new ConfigService({
        FRONTEND_URL: 'https://antifake.io.vn',
      }),
    );
    const response = { redirect: jest.fn() };

    controller.handlePayOSReturn(
      {
        code: '00',
        id: 'link-1',
        cancel: 'false',
        status: 'PAID',
        orderCode: '123',
        ignored: 'must-not-forward',
      } as never,
      response as never,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://antifake.io.vn/payment-success?code=00&id=link-1&cancel=false&status=PAID&orderCode=123',
    );
  });

  it('redirects cancelled provider returns to the failed route', () => {
    const controller = new PaymentController(
      {} as never,
      {} as never,
      {} as never,
      new ConfigService({
        FRONTEND_URL: 'https://antifake.io.vn',
      }),
    );
    const response = { redirect: jest.fn() };

    controller.handlePayOSReturn(
      {
        code: '00',
        id: 'link-1',
        cancel: 'true',
        status: 'CANCELLED',
        orderCode: '123',
      } as never,
      response as never,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://antifake.io.vn/payment-failed?code=00&id=link-1&cancel=true&status=CANCELLED&orderCode=123',
    );
  });

  it('routes an unknown order webhook to the wallet top-up handler', async () => {
    const ordersRpcService = {
      handlePayOSWebhook: jest.fn().mockResolvedValue({
        received: true,
        ignored: true,
        reason: 'order_not_found',
      }),
    };
    const walletRpcService = {
      handleWalletTopUpWebhook: jest.fn().mockResolvedValue({
        success: true,
        message: 'Nạp tiền vào ví thành công.',
      }),
    };
    const controller = new PaymentController(
      ordersRpcService as never,
      walletRpcService as never,
      { notifyOrderChanged: jest.fn() } as never,
      new ConfigService(),
    );
    const payload = { code: '00', desc: 'success', success: true, signature: 'sig', data: {} };

    await expect(controller.handlePayOSWebhook(payload)).resolves.toEqual({
      success: true,
      message: 'Nạp tiền vào ví thành công.',
    });
    expect(walletRpcService.handleWalletTopUpWebhook).toHaveBeenCalledWith(payload);
  });
});
