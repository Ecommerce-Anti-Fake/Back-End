import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SupportedBank = {
  bin: string;
  code: string;
  name: string;
  shortName: string;
  logo: string | null;
  lookupSupported: boolean;
  transferSupported: boolean;
};

@Injectable()
export class VietQrBankAccountLookupService {
  private bankCache: { expiresAt: number; items: SupportedBank[] } | null = null;

  constructor(private readonly configService: ConfigService) {}

  async listBanks(): Promise<SupportedBank[]> {
    if (this.bankCache && this.bankCache.expiresAt > Date.now()) {
      return this.bankCache.items;
    }

    const response = await this.fetchProvider(`${this.baseUrl()}/v2/banks`);
    const payload = await this.readJson(response);
    if (!response.ok || payload.code !== '00' || !Array.isArray(payload.data)) {
      throw new ServiceUnavailableException('Không thể tải danh sách ngân hàng.');
    }

    const items = payload.data
      .map((item) => this.parseBank(item))
      .filter((item): item is SupportedBank => item !== null)
      .sort((left, right) => left.shortName.localeCompare(right.shortName, 'vi'));
    if (!items.length) {
      throw new ServiceUnavailableException('Danh sách ngân hàng không hợp lệ.');
    }

    this.bankCache = {
      expiresAt: Date.now() + 24 * 60 * 60_000,
      items,
    };
    return items;
  }

  async lookupAccount(input: { bankBin: string; accountNumber: string }) {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('Tra cứu tài khoản ngân hàng chưa được bật.');
    }
    const credentials = this.credentials();
    const response = await this.fetchProvider(`${this.baseUrl()}/v2/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': credentials.clientId,
        'x-api-key': credentials.apiKey,
      },
      body: JSON.stringify({
        bin: input.bankBin,
        accountNumber: input.accountNumber,
      }),
    });
    const payload = await this.readJson(response);
    if (!response.ok) {
      throw new ServiceUnavailableException('Dịch vụ tra cứu ngân hàng đang gián đoạn.');
    }
    if (payload.code !== '00') {
      throw new BadRequestException('Không tìm thấy tài khoản ngân hàng này.');
    }
    const data = this.asRecord(payload.data);
    const accountHolder =
      typeof data?.accountName === 'string' ? data.accountName.trim() : '';
    if (!accountHolder || accountHolder.length > 150) {
      throw new ServiceUnavailableException('Dịch vụ ngân hàng trả về dữ liệu không hợp lệ.');
    }
    return { accountHolder, provider: 'VIETQR' as const };
  }

  private async fetchProvider(url: string, init?: RequestInit) {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('Dịch vụ ngân hàng đang gián đoạn.');
    }
  }

  private async readJson(response: Response): Promise<Record<string, unknown>> {
    try {
      return this.asRecord(await response.json()) ?? {};
    } catch {
      throw new ServiceUnavailableException('Dịch vụ ngân hàng trả về dữ liệu không hợp lệ.');
    }
  }

  private parseBank(value: unknown): SupportedBank | null {
    const item = this.asRecord(value);
    if (!item) return null;
    const bin = typeof item.bin === 'string' ? item.bin.trim() : '';
    const code = typeof item.code === 'string' ? item.code.trim().toUpperCase() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const shortName = typeof item.shortName === 'string' ? item.shortName.trim() : '';
    const logo = typeof item.logo === 'string' && item.logo.startsWith('https://')
      ? item.logo
      : null;
    if (!/^\d{6}$/.test(bin) || !code || !name || !shortName) return null;
    return {
      bin,
      code,
      name,
      shortName,
      logo,
      lookupSupported: Number(item.lookupSupported) === 1,
      transferSupported: Number(item.transferSupported) === 1,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private isEnabled() {
    return String(this.configService.get<string | boolean>('BANK_ACCOUNT_LOOKUP_ENABLED') ?? '')
      .trim()
      .toLowerCase() === 'true';
  }

  private credentials() {
    const clientId = this.configService.get<string>('VIETQR_CLIENT_ID')?.trim();
    const apiKey = this.configService.get<string>('VIETQR_API_KEY')?.trim();
    if (!clientId || !apiKey) {
      throw new ServiceUnavailableException('VietQR credentials are not configured.');
    }
    return { clientId, apiKey };
  }

  private baseUrl() {
    return (
      this.configService.get<string>('VIETQR_API_BASE_URL')?.trim() ||
      'https://api.vietqr.io'
    ).replace(/\/$/, '');
  }
}
