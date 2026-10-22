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

  it('uses a safe cross-instance PayOS order code', async () => {
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
    expect(body.expiredAt).toBe(Math.floor(Date.now() / 1000) + 900);
    expect(body.orderCode).toBeGreaterThan(0);
    expect(body.orderCode).toBeLessThan(2 ** 48);
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

  it('reads a payment-link status for return-time wallet reconciliation', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        code: '00',
        data: {
          id: 'link-paid',
          status: 'PAID',
          amount: 100000,
          amountPaid: 100000,
        },
      }),
    });
    global.fetch = fetchMock as never;

    await expect(new PayOSTopUpService(config).getPaymentLink('link-paid')).resolves.toEqual({
      paymentLinkId: 'link-paid',
      status: 'PAID',
      amount: 100000,
      amountPaid: 100000,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://payos.test/v2/payment-requests/link-paid',
      expect.objectContaining({ method: 'GET' }),
    );
  });
  it('persists the exact requested expiry and official QR payload', async () => {
    const expiredAt = Math.floor(Date.now() / 1000) + 900;
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ code: '00', data: { paymentLinkId: 'link-qr', checkoutUrl: 'https://pay.payos.vn/web/link-qr', qrCode: 'official-emv', expiredAt } }) }) as never;
    await expect(new PayOSTopUpService(config).createPaymentLink({ amount: 10000, idempotencyKey: 'qr-1' })).resolves.toMatchObject({ qrCode: 'official-emv', expiresAt: new Date(expiredAt * 1000) });
  });

  it('does not report cancellation when PayOS rejects it and still returns PENDING', async () => {
    const provider = { id: 'link-1', status: 'PENDING', amount: 10000, amountPaid: 0 };
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ code: '01' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ code: '00', data: provider }) });
    global.fetch = fetchMock as never;
    await expect(new PayOSTopUpService(config).cancelPaymentLink('link-1')).rejects.toThrow('not confirmed');
  });

  it('reads back a paid link after a cancel conflict', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ code: '01' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ code: '00', data: { id: 'link-1', status: 'PAID', amount: 10000, amountPaid: 10000 } }) }) as never;
    await expect(new PayOSTopUpService(config).cancelPaymentLink('link-1')).resolves.toMatchObject({ status: 'PAID' });
  });
});
