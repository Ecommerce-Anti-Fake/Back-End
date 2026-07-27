import { ConfigService } from '@nestjs/config';
import { PayOSTopUpService } from './payos-top-up.service';

describe('PayOSTopUpService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects a production webhook return URL when only the legacy Render URL exists', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        data: {
          paymentLinkId: 'link-1',
          checkoutUrl: 'https://pay.payos.vn/web/link-1',
        },
      }),
    }) as never;
    const service = new PayOSTopUpService(
      new ConfigService({
        PAYOS_CLIENT_ID: 'client-id',
        PAYOS_API_KEY: 'api-key',
        PAYOS_CHECKSUM_KEY: 'checksum-key',
        PAYOS_API_BASE_URL: 'https://payos.test',
        NODE_ENV: 'production',
        FRONTEND_URL: 'https://antifake.io.vn',
        RENDER_EXTERNAL_URL: 'https://legacy-platform.example',
      }),
    );

    await expect(
      service.createPaymentLink({
        amount: 100000,
        idempotencyKey: 'wallet-top-up-1',
        destination: 'USER',
      }),
    ).rejects.toThrow('BACKEND_PUBLIC_URL');
  });
});
