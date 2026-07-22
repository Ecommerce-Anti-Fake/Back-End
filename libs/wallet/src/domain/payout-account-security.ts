import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

@Injectable()
export class PayoutAccountSecurityService {
  constructor(private readonly configService: ConfigService) {}

  encryptAccountNumber(value: string): string {
    const accountNumber = this.normalizeAccountNumber(value);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(accountNumber, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
  }

  decryptAccountNumber(value: string): string {
    const [version, ivValue, tagValue, ciphertextValue] = value.split(':');
    if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
      throw new InternalServerErrorException('Invalid encrypted payout account data');
    }

    try {
      const decipher = createDecipheriv('aes-256-gcm', this.getKey(), Buffer.from(ivValue, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new InternalServerErrorException('Cannot decrypt payout account data');
    }
  }

  hashAccountNumber(bankBin: string, value: string): string {
    return createHmac('sha256', this.getKey())
      .update(`${bankBin.trim()}:${this.normalizeAccountNumber(value)}`)
      .digest('hex');
  }

  operationDigest(value: Record<string, unknown>): string {
    const canonical = Object.keys(value)
      .sort()
      .map((key) => `${key}=${String(value[key] ?? '')}`)
      .join('&');
    return createHmac('sha256', this.getKey()).update(canonical).digest('hex');
  }

  tokenHash(value: string): string {
    return createHmac('sha256', this.getKey()).update(value).digest('hex');
  }

  maskAccountNumber(value: string): string {
    const normalized = this.normalizeAccountNumber(value);
    return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
  }

  normalizeAccountNumber(value: string): string {
    return value.replace(/\s+/g, '').trim();
  }

  normalizeHolderName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/Đ/g, 'D')
      .replace(/đ/g, 'd')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  holderNamesMatch(left: string, right: string): boolean {
    return this.normalizeHolderName(left) === this.normalizeHolderName(right);
  }

  private getKey(): Buffer {
    const configured = this.configService.get<string>('PAYOUT_ACCOUNT_ENCRYPTION_KEY')?.trim();
    if (!configured) throw new InternalServerErrorException('Payout account encryption is not configured');

    const key = /^[0-9a-f]{64}$/i.test(configured)
      ? Buffer.from(configured, 'hex')
      : Buffer.from(configured, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException('Payout account encryption key must be 32 bytes');
    }
    return key;
  }
}
