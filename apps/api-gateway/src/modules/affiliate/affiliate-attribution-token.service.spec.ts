import { BadRequestException } from '@nestjs/common';
import { AffiliateAttributionTokenService } from './affiliate-attribution-token.service';

describe('AffiliateAttributionTokenService', () => {
  const config = { get: jest.fn().mockReturnValue('test-attribution-secret-that-is-long-enough') };
  const service = new AffiliateAttributionTokenService(config as never);

  it('round-trips a signed attribution until its expiry', () => {
    const token = service.sign({
      code: 'spring-aff-001',
      programId: 'program-1',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    expect(service.verify(token, new Date('2026-07-25T00:00:00.000Z'))).toEqual({
      code: 'spring-aff-001',
      programId: 'program-1',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('rejects expired or tampered tokens', () => {
    const token = service.sign({
      code: 'spring-aff-001',
      programId: 'program-1',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    expect(() => service.verify(token, new Date('2026-08-01T00:00:00.001Z')))
      .toThrow(BadRequestException);
    expect(() => service.verify(`${token}tampered`, new Date('2026-07-25T00:00:00.000Z')))
      .toThrow('Affiliate attribution token is invalid');
  });

  it('prefers a manually entered code over a stored link token', () => {
    const token = service.sign({
      code: 'link-code',
      programId: 'program-1',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    expect(
      service.resolvePreferredCode({
        manualCode: ' MANUAL-CODE ',
        attributionToken: token,
        now: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ).toBe('manual-code');
    expect(
      service.resolvePreferredCode({
        attributionToken: token,
        now: new Date('2026-07-25T00:00:00.000Z'),
      }),
    ).toBe('link-code');
  });

  it('requires a dedicated attribution secret with sufficient entropy', () => {
    const missingSecretService = new AffiliateAttributionTokenService({
      get: jest.fn().mockReturnValue(undefined),
    } as never);
    const shortSecretService = new AffiliateAttributionTokenService({
      get: jest.fn().mockReturnValue('too-short'),
    } as never);
    const input = {
      code: 'spring-aff-001',
      programId: 'program-1',
      expiresAt: new Date('2026-08-01T00:00:00.000Z'),
    };

    expect(() => missingSecretService.sign(input)).toThrow('AFFILIATE_ATTRIBUTION_SECRET');
    expect(() => shortSecretService.sign(input)).toThrow('at least 32 characters');
  });
});
