import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export type PayOSPaymentLink = {
  orderCode: number;
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode?: string;
};

type PayOSCreatePaymentResponse = {
  code?: string;
  desc?: string;
  data?: {
    paymentLinkId?: string;
    checkoutUrl?: string;
    qrCode?: string;
  };
};

@Injectable()
export class PayOSPaymentService {
  constructor(private readonly configService: ConfigService) {}

  async createPaymentLink(input: {
    orderId: string;
    amount: number;
    description: string;
    buyerName?: string | null;
    buyerPhone?: string | null;
    itemName: string;
    quantity: number;
    returnUrl?: string | null;
    cancelUrl?: string | null;
  }): Promise<PayOSPaymentLink> {
    const credentials = this.getCredentials();
    const amount = Math.round(input.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('payOS requires a positive integer VND amount');
    }

    const orderCode = this.createOrderCode();
    const returnUrl = this.resolveUrl(input.returnUrl, 'PAYOS_RETURN_URL', `/orders/${input.orderId}?payment=payos-return`);
    const cancelUrl = this.resolveUrl(input.cancelUrl, 'PAYOS_CANCEL_URL', `/orders/${input.orderId}?payment=payos-cancel`);
    const description = this.normalizeDescription(input.description, input.orderId);
    const signaturePayload = {
      amount,
      cancelUrl,
      description,
      orderCode,
      returnUrl,
    };
    const body = {
      ...signaturePayload,
      buyerName: input.buyerName?.trim() || undefined,
      buyerPhone: input.buyerPhone?.trim() || undefined,
      items: [
        {
          name: input.itemName.slice(0, 255),
          quantity: input.quantity,
          price: amount,
        },
      ],
      signature: this.signObject(signaturePayload, credentials.checksumKey),
    };

    const response = await fetch(`${credentials.baseUrl}/v2/payment-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': credentials.clientId,
        'x-api-key': credentials.apiKey,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as PayOSCreatePaymentResponse | null;
    if (!response.ok || payload?.code !== '00' || !payload.data?.paymentLinkId || !payload.data.checkoutUrl) {
      throw new ServiceUnavailableException(payload?.desc || 'Could not create payOS payment link');
    }

    return {
      orderCode,
      paymentLinkId: payload.data.paymentLinkId,
      checkoutUrl: payload.data.checkoutUrl,
      qrCode: payload.data.qrCode,
    };
  }

  verifyWebhook(input: { data: Record<string, unknown>; signature: string }) {
    const credentials = this.getCredentials();
    const expected = this.signObject(input.data, credentials.checksumKey);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(input.signature || '');
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private getCredentials() {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID')?.trim();
    const apiKey = this.configService.get<string>('PAYOS_API_KEY')?.trim();
    const checksumKey =
      this.configService.get<string>('PAYOS_CHECK_SUM_KEY')?.trim() ||
      this.configService.get<string>('PAYOS_CHECKSUM_KEY')?.trim();
    const baseUrl = this.configService.get<string>('PAYOS_API_BASE_URL')?.trim() || 'https://api-merchant.payos.vn';

    if (!clientId || !apiKey || !checksumKey) {
      throw new ServiceUnavailableException('payOS credentials are not configured');
    }

    return { clientId, apiKey, checksumKey, baseUrl };
  }

  private resolveUrl(explicitUrl: string | null | undefined, envName: string, fallbackPath: string) {
    const explicit = explicitUrl?.trim();
    if (explicit) {
      return explicit;
    }

    const configured = this.configService.get<string>(envName)?.trim();
    if (configured) {
      return configured;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:5173';
    return `${frontendUrl.replace(/\/$/, '')}${fallbackPath}`;
  }

  private normalizeDescription(description: string, orderId: string) {
    const normalized = description
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim();

    return (normalized || `DH${orderId.replace(/-/g, '').slice(0, 7)}`).slice(0, 9);
  }

  private createOrderCode() {
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
  }

  private signObject(data: Record<string, unknown>, checksumKey: string) {
    const query = Object.keys(data)
      .sort()
      .filter((key) => data[key] !== undefined)
      .map((key) => {
        let value = data[key];
        if (Array.isArray(value)) {
          value = JSON.stringify(value.map((item) => this.sortObject(item as Record<string, unknown>)));
        }
        if (value === null || value === 'null' || value === 'undefined') {
          value = '';
        }
        return `${key}=${String(value)}`;
      })
      .join('&');

    return createHmac('sha256', checksumKey).update(query).digest('hex');
  }

  private sortObject(data: Record<string, unknown>) {
    return Object.keys(data)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = data[key];
        return result;
      }, {});
  }
}
