import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acquirePassengerProcessLock,
  createAsyncSingleton,
  describeBindError,
  resolveEmbeddedServicePorts,
  validatePassengerEnvironment,
} from './passenger-runtime';

const validPassengerEnvironment = {
  NODE_ENV: 'production',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/antifake',
  JWT_SECRET: 'jwt-placeholder',
  REFRESH_TOKEN_SECRET: 'refresh-placeholder',
  FRONTEND_URL: 'https://example.com',
  BACKEND_PUBLIC_URL: 'https://api.example.com',
  CLOUDINARY_CLOUD_NAME: 'cloud-name',
  CLOUDINARY_API_KEY: 'cloud-key',
  CLOUDINARY_API_SECRET: 'cloud-secret',
  AGORA_APP_ID: 'a'.repeat(32),
  AGORA_APP_CERTIFICATE: 'b'.repeat(32),
  AGORA_RTC_TOKEN_TTL_SECONDS: '3600',
  FIREBASE_PROJECT_ID: 'firebase-project',
  FIREBASE_CLIENT_EMAIL: 'firebase@example.com',
  FIREBASE_PRIVATE_KEY: 'firebase-private-key',
  PAYOS_CLIENT_ID: 'payos-client',
  PAYOS_API_KEY: 'payos-key',
  PAYOS_CHECK_SUM_KEY: 'payos-checksum',
  GHN_TOKEN: 'ghn-token',
  GHN_SHOP_ID: '12345',
};

describe('Passenger runtime configuration', () => {
  it('uses default TCP ports and accepts environment overrides', () => {
    expect(resolveEmbeddedServicePorts({})).toEqual({
      auth: 4001,
      users: 4002,
      catalog: 4003,
      orders: 4004,
      affiliate: 4005,
    });

    expect(
      resolveEmbeddedServicePorts({
        AUTH_SERVICE_PORT: '4101',
        USERS_SERVICE_PORT: '4102',
        CATALOG_SERVICE_PORT: '4103',
        ORDERS_SERVICE_PORT: '4104',
        AFFILIATE_SERVICE_PORT: '4105',
      }),
    ).toEqual({
      auth: 4101,
      users: 4102,
      catalog: 4103,
      orders: 4104,
      affiliate: 4105,
    });
  });

  it('rejects invalid or duplicate TCP ports', () => {
    expect(() =>
      resolveEmbeddedServicePorts({ AUTH_SERVICE_PORT: 'not-a-port' }),
    ).toThrow('AUTH_SERVICE_PORT must be an integer between 1 and 65535');

    expect(() =>
      resolveEmbeddedServicePorts({
        AUTH_SERVICE_PORT: '4101',
        USERS_SERVICE_PORT: '4101',
      }),
    ).toThrow('Internal TCP service ports must be unique');
  });

  it('validates required Passenger configuration without exposing values', () => {
    expect(
      validatePassengerEnvironment(validPassengerEnvironment),
    ).toMatchObject({
      httpPort: 3000,
      servicePorts: {
        auth: 4001,
        users: 4002,
        catalog: 4003,
        orders: 4004,
        affiliate: 4005,
      },
    });

    const invalidEnvironment = { ...validPassengerEnvironment };
    delete invalidEnvironment.DATABASE_URL;
    delete invalidEnvironment.JWT_SECRET;

    expect(() => validatePassengerEnvironment(invalidEnvironment)).toThrow(
      'Missing required Passenger configuration: DATABASE_URL, JWT_SECRET',
    );
  });

  it('accepts supported aliases and validates feature-dependent providers', () => {
    const environment = {
      ...validPassengerEnvironment,
      FRONTEND_URL: '',
      CORS_ALLOWED_ORIGINS: 'https://example.com',
      BACKEND_PUBLIC_URL: '',
      API_PUBLIC_URL: 'https://api.example.com',
      PAYOS_CHECK_SUM_KEY: '',
      PAYOS_CHECKSUM_KEY: 'payos-checksum-alias',
      REDIS_ENABLED: 'true',
      REDIS_URL: 'redis://127.0.0.1:6379/0',
      BANK_ACCOUNT_LOOKUP_ENABLED: 'true',
      VIETQR_CLIENT_ID: 'vietqr-client',
      VIETQR_API_KEY: 'vietqr-key',
      SELLER_WITHDRAWALS_ENABLED: 'true',
      PAYOUT_ACCOUNT_ENCRYPTION_KEY: 'a'.repeat(64),
    };

    expect(() => validatePassengerEnvironment(environment)).not.toThrow();

    environment.REDIS_URL = '';
    environment.VIETQR_API_KEY = '';
    environment.PAYOUT_ACCOUNT_ENCRYPTION_KEY = '';

    expect(() => validatePassengerEnvironment(environment)).toThrow(
      'Missing required Passenger configuration: REDIS_URL or REDIS_HOST, VIETQR_API_KEY, PAYOUT_ACCOUNT_ENCRYPTION_KEY',
    );
  });

  it('rejects an HTTP port that collides with an internal TCP service', () => {
    expect(() =>
      validatePassengerEnvironment({
        ...validPassengerEnvironment,
        PORT: '4001',
      }),
    ).toThrow('PORT must not reuse an internal TCP service port');
  });

  it('turns EADDRINUSE into an explicit single-worker error', () => {
    const error = Object.assign(new Error('address already in use'), {
      code: 'EADDRINUSE',
    });

    expect(
      (describeBindError(error, 'auth-service on 127.0.0.1:4001') as Error)
        .message,
    ).toBe(
      'Internal service port is already in use (auth-service on 127.0.0.1:4001). Passenger must run exactly one application process.',
    );
  });
});

describe('Passenger process lock', () => {
  it('rejects a second live worker and releases only its own lock', () => {
    const appRoot = mkdtempSync(join(tmpdir(), 'antifake-passenger-lock-'));
    const firstLock = acquirePassengerProcessLock({
      appRoot,
      pid: 101,
      isProcessAlive: () => true,
    });

    expect(() =>
      acquirePassengerProcessLock({
        appRoot,
        pid: 202,
        isProcessAlive: () => true,
      }),
    ).toThrow('Passenger must run exactly one application process');

    const lockPath = firstLock.path;
    const owner = JSON.parse(readFileSync(lockPath, 'utf8')) as {
      token: string;
    };
    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: 303,
        token: 'new-owner',
        startedAt: new Date().toISOString(),
      }),
    );
    firstLock.release();
    expect(readFileSync(lockPath, 'utf8')).toContain('new-owner');

    writeFileSync(
      lockPath,
      JSON.stringify({
        pid: 101,
        token: owner.token,
        startedAt: new Date().toISOString(),
      }),
    );
    firstLock.release();
    expect(() => readFileSync(lockPath, 'utf8')).toThrow();
  });

  it('reclaims a stale worker lock', () => {
    const appRoot = mkdtempSync(join(tmpdir(), 'antifake-passenger-stale-'));
    const firstLock = acquirePassengerProcessLock({
      appRoot,
      pid: 101,
      isProcessAlive: () => true,
    });
    const stalePath = firstLock.path;

    const replacement = acquirePassengerProcessLock({
      appRoot,
      pid: 202,
      isProcessAlive: () => false,
    });

    expect(replacement.path).toBe(stalePath);
    expect(readFileSync(stalePath, 'utf8')).toContain('"pid":202');
    replacement.release();
  });
});

describe('Passenger bootstrap singleton', () => {
  it('runs the bootstrap factory only once', async () => {
    const factory = jest.fn(() => Promise.resolve({ close: jest.fn() }));
    const start = createAsyncSingleton(factory);

    const [first, second] = await Promise.all([start(), start()]);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });
});
