import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';

describe('PaymentController', () => {
  it('strips payOS return query params by redirecting to the frontend success route', () => {
    const controller = new PaymentController(
      {} as never,
      {} as never,
      new ConfigService({
        FRONTEND_URL: 'https://anti-fake-alpha.vercel.app',
      }),
    );
    const response = { redirect: jest.fn() };

    controller.handlePayOSReturn(response as never);

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://anti-fake-alpha.vercel.app/payment-success',
    );
  });
});
