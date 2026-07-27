import { ConfigService } from '@nestjs/config';
import { PaymentController } from './payment.controller';

describe('PaymentController', () => {
  it('strips payOS return query params by redirecting to the frontend success route', () => {
    const controller = new PaymentController(
      {} as never,
      {} as never,
      new ConfigService({
        FRONTEND_URL: 'https://antifake.io.vn',
      }),
    );
    const response = { redirect: jest.fn() };

    controller.handlePayOSReturn(response as never);

    expect(response.redirect).toHaveBeenCalledWith(
      302,
      'https://antifake.io.vn/payment-success',
    );
  });
});
