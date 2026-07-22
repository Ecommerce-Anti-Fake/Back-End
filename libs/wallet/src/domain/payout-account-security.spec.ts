import { PayoutAccountSecurityService } from './payout-account-security';

describe('PayoutAccountSecurityService', () => {
  const key = '11'.repeat(32);
  const service = new PayoutAccountSecurityService({
    get: jest.fn((name: string) => name === 'PAYOUT_ACCOUNT_ENCRYPTION_KEY' ? key : undefined),
  } as never);

  it('encrypts account numbers with authenticated encryption and decrypts them', () => {
    const encrypted = service.encryptAccountNumber(' 0123 456 789 ');

    expect(encrypted).not.toContain('0123456789');
    expect(service.decryptAccountNumber(encrypted)).toBe('0123456789');
    expect(service.maskAccountNumber('0123456789')).toBe('******6789');
  });

  it('creates a deterministic keyed hash scoped to the bank', () => {
    expect(service.hashAccountNumber('970436', '0123456789')).toBe(
      service.hashAccountNumber('970436', '0123 456 789'),
    );
    expect(service.hashAccountNumber('970436', '0123456789')).not.toBe(
      service.hashAccountNumber('970415', '0123456789'),
    );
  });

  it('normalizes Vietnamese holder names without treating formatting as verification', () => {
    expect(service.normalizeHolderName('  Nguyễn  Văn-Á ')).toBe('NGUYEN VAN A');
    expect(service.holderNamesMatch('NGUYỄN VĂN A', 'nguyen van a')).toBe(true);
    expect(service.holderNamesMatch('NGUYỄN VĂN A', 'NGUYỄN VĂN B')).toBe(false);
  });

  it('hashes authorization tokens without retaining the secret value', () => {
    expect(service.tokenHash('one-time-secret')).toMatch(/^[a-f0-9]{64}$/);
    expect(service.tokenHash('one-time-secret')).not.toContain('one-time-secret');
  });
});
