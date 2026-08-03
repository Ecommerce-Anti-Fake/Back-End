import { ConfigService } from '@nestjs/config';
import { WalletTopUpWebhookController } from './wallet-top-up-webhook.controller';

describe('WalletTopUpWebhookController', () => {
  const createController = () =>
    new WalletTopUpWebhookController(
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
});
