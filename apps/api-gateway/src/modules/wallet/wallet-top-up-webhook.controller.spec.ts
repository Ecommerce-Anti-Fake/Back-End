import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletTopUpWebhookController } from './wallet-top-up-webhook.controller';

describe('WalletTopUpWebhookController', () => {
  const createController = () =>
    new WalletTopUpWebhookController(
      {} as never,
      {} as never,
      new ConfigService({ FRONTEND_URL: 'https://antifake.io.vn' }),
    );

  it('preserves safe PayOS fields on a successful user-wallet return', () => {
    const response = { redirect: jest.fn() };

    createController().handleReturn(
      {
        code: '00',
        id: 'link-1',
        cancel: 'false',
        status: 'PAID',
        orderCode: '123',
        ignored: 'secret',
      },
      response as never,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://antifake.io.vn/profile/wallet?topUp=returned&code=00&id=link-1&cancel=false&status=PAID&orderCode=123',
    );
  });

  it('marks a cancelled user-wallet return for the wallet page', () => {
    const response = { redirect: jest.fn() };

    createController().handleReturn(
      { code: '00', id: 'link-2', cancel: 'true', status: 'CANCELLED' },
      response as never,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://antifake.io.vn/profile/wallet?topUp=cancelled&code=00&id=link-2&cancel=true&status=CANCELLED',
    );
  });

  it('routes an order webhook to the order handler when no wallet top-up matches', async () => {
    const walletRpcService = {
      handleWalletTopUpWebhook: jest.fn().mockRejectedValue(
        new BadRequestException('Không tìm thấy giao dịch nạp ví.'),
      ),
    };
    const ordersRpcService = {
      handlePayOSWebhook: jest.fn().mockResolvedValue({ received: true }),
    };
    const controller = new WalletTopUpWebhookController(
      walletRpcService as never,
      ordersRpcService as never,
      new ConfigService(),
    );
    const payload = { code: '00', desc: 'success', success: true, signature: 'sig', data: {} };

    await expect(controller.handle(payload)).resolves.toEqual({ received: true });
    expect(ordersRpcService.handlePayOSWebhook).toHaveBeenCalledWith(payload);
  });

  it('does not route an invalid wallet webhook signature to orders', async () => {
    const walletRpcService = {
      handleWalletTopUpWebhook: jest.fn().mockRejectedValue(
        new BadRequestException('Chữ ký webhook PayOS không hợp lệ.'),
      ),
    };
    const ordersRpcService = { handlePayOSWebhook: jest.fn() };
    const controller = new WalletTopUpWebhookController(
      walletRpcService as never,
      ordersRpcService as never,
      new ConfigService(),
    );

    await expect(controller.handle({} as never)).rejects.toThrow('Chữ ký webhook');
    expect(ordersRpcService.handlePayOSWebhook).not.toHaveBeenCalled();
  });
});
