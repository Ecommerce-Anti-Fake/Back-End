import { ConfigService } from '@nestjs/config';
import { PayOSPaymentService } from './payos-payment.service';

describe('PayOSPaymentService', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  let service: PayOSPaymentService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-07-10T00:00:00.000Z'));
    jest.spyOn(Math, 'random').mockReturnValue(0.123);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        data: {
          paymentLinkId: 'link-1',
          checkoutUrl: 'https://pay.payos.vn/web/link-1',
          qrCode: 'qr-code',
        },
      }),
    });
    global.fetch = fetchMock as never;
    service = new PayOSPaymentService(
      new ConfigService({
        PAYOS_CLIENT_ID: 'client-id',
        PAYOS_API_KEY: 'api-key',
        PAYOS_CHECKSUM_KEY: 'checksum-key',
        PAYOS_API_BASE_URL: 'https://payos.test',
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://antifake.io.vn',
        BACKEND_PUBLIC_URL: 'https://api.antifake.test',
      }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('uses the frontend payment path as the default embedded return URL', async () => {
    await service.createPaymentLink({
      orderId: 'order-1',
      amount: 100000,
      description: 'DHorder1',
      buyerName: 'Buyer',
      buyerPhone: '0900000000',
      itemName: 'Offer',
      quantity: 1,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.returnUrl).toBe('https://antifake.io.vn/payment');
    expect(body.cancelUrl).toBe('https://antifake.io.vn/payment-failed');
  });

  it('rejects a production return URL when only the legacy Render URL exists', async () => {
    service = new PayOSPaymentService(
      new ConfigService({
        PAYOS_CLIENT_ID: 'client-id',
        PAYOS_API_KEY: 'api-key',
        PAYOS_CHECKSUM_KEY: 'checksum-key',
        PAYOS_API_BASE_URL: 'https://payos.test',
        NODE_ENV: 'production',
        RENDER_EXTERNAL_URL: 'https://legacy-platform.example',
      }),
    );

    await expect(
      service.createPaymentLink({
        orderId: 'order-1',
        amount: 100000,
        description: 'DHorder1',
        buyerName: 'Buyer',
        buyerPhone: '0900000000',
        itemName: 'Offer',
        quantity: 1,
      }),
    ).rejects.toThrow('FRONTEND_URL');
  });
});
