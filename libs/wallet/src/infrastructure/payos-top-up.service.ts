import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';

export type WalletTopUpPaymentLink = {
  orderCode: string;
  paymentLinkId: string;
  checkoutUrl: string;
};

@Injectable()
export class PayOSTopUpService {
  constructor(private readonly configService: ConfigService) {}

  async createPaymentLink(input: {
    amount: Prisma.Decimal | string | number;
    idempotencyKey: string;
    destination?: 'USER' | 'SHOP';
    returnUrl?: string | null;
    cancelUrl?: string | null;
  }): Promise<WalletTopUpPaymentLink> {
    const amount = Number(input.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('Số tiền nạp phải là số nguyên VND lớn hơn 0.');
    }

    const credentials = this.getCredentials();
    const orderCode = String(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    const returnUrl = input.returnUrl?.trim() || (
      input.destination === 'SHOP'
        ? this.resolveUrl('PAYOS_SHOP_WALLET_RETURN_URL', '/seller/wallet?topUp=returned')
        : this.resolveUrl('PAYOS_WALLET_RETURN_URL', '/api/wallet/top-ups/payos/return')
    );
    const cancelUrl = input.cancelUrl?.trim() || (
      input.destination === 'SHOP'
        ? this.resolveUrl('PAYOS_SHOP_WALLET_CANCEL_URL', '/seller/wallet')
        : this.resolveUrl('PAYOS_WALLET_CANCEL_URL', '/profile/wallet')
    );
    const description = `Nap vi ${input.idempotencyKey.replace(/[^a-zA-Z0-9]/g, '').slice(-4) || 'user'}`.slice(0, 9);
    const signaturePayload = { amount, cancelUrl, description, orderCode: Number(orderCode), returnUrl };
    const body = {
      ...signaturePayload,
      items: [{ name: 'Nap tien vi AntiFake', quantity: 1, price: amount }],
      signature: this.signObject(signaturePayload, credentials.checksumKey),
      buyerName: 'AntiFake user',
    };

    const response = await fetch(`${credentials.baseUrl}/v2/payment-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': credentials.clientId, 'x-api-key': credentials.apiKey },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as { code?: string; desc?: string; data?: { paymentLinkId?: string; checkoutUrl?: string } } | null;
    if (!response.ok || payload?.code !== '00' || !payload.data?.paymentLinkId || !payload.data.checkoutUrl) {
      throw new ServiceUnavailableException(payload?.desc || 'Không thể tạo link nạp tiền PayOS.');
    }
    return { orderCode, paymentLinkId: payload.data.paymentLinkId, checkoutUrl: payload.data.checkoutUrl };
  }

  verifyWebhook(data: Record<string, unknown>, signature: string) {
    const expected = this.signObject(data, this.getCredentials().checksumKey);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature || '');
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private getCredentials() {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID')?.trim();
    const apiKey = this.configService.get<string>('PAYOS_API_KEY')?.trim();
    const checksumKey = this.configService.get<string>('PAYOS_CHECK_SUM_KEY')?.trim() || this.configService.get<string>('PAYOS_CHECKSUM_KEY')?.trim();
    const baseUrl = this.configService.get<string>('PAYOS_API_BASE_URL')?.trim() || 'https://api-merchant.payos.vn';
    if (!clientId || !apiKey || !checksumKey) throw new ServiceUnavailableException('payOS credentials are not configured');
    return { clientId, apiKey, checksumKey, baseUrl };
  }

  private resolveUrl(envName: string, fallbackPath: string) {
    const configured = this.configService.get<string>(envName)?.trim();
    if (configured) return configured;
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:5173';
    const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL')?.trim() || this.configService.get<string>('API_PUBLIC_URL')?.trim() || this.configService.get<string>('RENDER_EXTERNAL_URL')?.trim();
    return fallbackPath.startsWith('/api/') && backendUrl ? `${backendUrl.replace(/\/$/, '')}${fallbackPath}` : `${frontendUrl.replace(/\/$/, '')}${fallbackPath}`;
  }

  private signObject(data: Record<string, unknown>, checksumKey: string) {
    const query = Object.keys(data).sort().filter((key) => data[key] !== undefined).map((key) => `${key}=${data[key] === null ? '' : String(data[key])}`).join('&');
    return createHmac('sha256', checksumKey).update(query).digest('hex');
  }
}
