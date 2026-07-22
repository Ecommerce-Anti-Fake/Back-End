import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

interface AffiliateAttributionTokenPayload {
  code: string;
  programId: string;
  exp: number;
}

@Injectable()
export class AffiliateAttributionTokenService {
  constructor(private readonly configService: ConfigService) {}

  sign(input: { code: string; programId: string; expiresAt: Date }): string {
    const payload: AffiliateAttributionTokenPayload = {
      code: input.code.trim().toLowerCase(),
      programId: input.programId,
      exp: Math.floor(input.expiresAt.getTime() / 1000),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    return `${encodedPayload}.${this.signature(encodedPayload)}`;
  }

  resolvePreferredCode(input: {
    manualCode?: string | null;
    attributionToken?: string | null;
    now?: Date;
  }): string | null {
    const manualCode = input.manualCode?.trim().toLowerCase();
    if (manualCode) {
      return manualCode;
    }
    if (!input.attributionToken) {
      return null;
    }

    return this.verify(input.attributionToken, input.now).code;
  }

  verify(
    token: string,
    now = new Date(),
  ): { code: string; programId: string; expiresAt: Date } {
    const [encodedPayload, providedSignature, extra] = token.split('.');
    if (!encodedPayload || !providedSignature || extra) {
      throw new BadRequestException('Affiliate attribution token is invalid');
    }

    const expectedSignature = this.signature(encodedPayload);
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Affiliate attribution token is invalid');
    }

    let payload: AffiliateAttributionTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as AffiliateAttributionTokenPayload;
    } catch {
      throw new BadRequestException('Affiliate attribution token is invalid');
    }

    if (
      typeof payload.code !== 'string' ||
      !payload.code.trim() ||
      typeof payload.programId !== 'string' ||
      !payload.programId ||
      !Number.isInteger(payload.exp)
    ) {
      throw new BadRequestException('Affiliate attribution token is invalid');
    }
    if (payload.exp <= Math.floor(now.getTime() / 1000)) {
      throw new BadRequestException('Affiliate attribution token has expired');
    }

    return {
      code: payload.code.trim().toLowerCase(),
      programId: payload.programId,
      expiresAt: new Date(payload.exp * 1000),
    };
  }

  private signature(payload: string): string {
    const secret = this.configService
      .get<string>('AFFILIATE_ATTRIBUTION_SECRET')
      ?.trim();
    if (!secret || secret.length < 32) {
      throw new Error(
        'AFFILIATE_ATTRIBUTION_SECRET must be configured with at least 32 characters',
      );
    }

    return createHmac('sha256', secret).update(payload).digest('base64url');
  }
}
