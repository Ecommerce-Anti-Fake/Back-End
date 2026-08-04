import { ConfigService } from '@nestjs/config';
import { PayOSTopUpService } from './payos-top-up.service';

describe('PayOSTopUpService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(Date.parse('2026-07-10T00:00:00.000Z'));
  });

  const config = new ConfigService({
    PAYOS_CLIENT_ID: 'client-id',
    PAYOS_API_KEY: 'api-key',
    PAYOS_CHECKSUM_KEY: 'checksum-key',
    PAYOS_API_BASE_URL: 'https://payos.test',
    FRONTEND_URL: 'https://antifake.io.vn',
    BACKEND_PUBLIC_URL: 'https://api.antifake.io.vn',
  });

  afterEach(() => {
    jest.useRealTimers();
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
        RENDER_EXTERNAL_URL: 'https://legacy-platform.example',
      }),
    );

    await expect(
      service.createPaymentLink({
        amount: 100000,
        idempotencyKey: 'wallet-top-up-1',
        destination: 'USER',
      }),
    ).rejects.toThrow('FRONTEND_URL');
  });

  it('marks the user-wallet cancel URL so a cancelled PayOS top-up is visible', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        data: {
          paymentLinkId: 'link-user',
          checkoutUrl: 'https://pay.payos.vn/web/link-user',
        },
      }),
    });
    global.fetch = fetchMock as never;

    await new PayOSTopUpService(config).createPaymentLink({
      amount: 100000,
      idempotencyKey: 'wallet-user-1',
      destination: 'USER',
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).cancelUrl).toBe(
      'https://antifake.io.vn/profile/wallet?topUp=cancelled',
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).returnUrl).toBe(
      'https://antifake.io.vn/payment',
    );
  });

  it('uses a compact PayOS order code for the embedded checkout', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        data: {
          paymentLinkId: 'link-user',
          checkoutUrl: 'https://pay.payos.vn/web/link-user',
        },
      }),
    });
    global.fetch = fetchMock as never;

    await new PayOSTopUpService(config).createPaymentLink({
      amount: 100000,
      idempotencyKey: 'wallet-user-1',
      destination: 'USER',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.orderCode).toBeGreaterThan(0);
    expect(body.orderCode).toBeLessThan(1_000_000);
  });

  it('marks the shop-wallet cancel URL so a cancelled PayOS top-up is visible', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        data: {
          paymentLinkId: 'link-shop',
          checkoutUrl: 'https://pay.payos.vn/web/link-shop',
        },
      }),
    });
    global.fetch = fetchMock as never;

    await new PayOSTopUpService(config).createPaymentLink({
      amount: 100000,
      idempotencyKey: 'wallet-shop-1',
      destination: 'SHOP',
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).cancelUrl).toBe(
      'https://antifake.io.vn/seller/wallet?topUp=cancelled',
    );
  });
});
