import {
  assertUatDatabaseTarget,
  assertUatPublicUrl,
  assertUatRuntimeDatabaseTarget,
  requiredUatSecret,
} from './uat-safety';

const safeEnvironment = {
  UAT_ENVIRONMENT: 'true',
  NODE_ENV: 'uat',
  DATABASE_URL: 'postgresql://uat_user@127.0.0.1:5432/antifake_uat',
  UAT_DATABASE_TARGET: 'antifake-uat-postgres',
  UAT_DATABASE_NAME: 'antifake_uat',
  UAT_DATABASE_HOST_ALLOWLIST: '',
  UAT_ISOLATION_CONFIRMED: 'true',
  UAT_PRODUCTION_DATABASE_TARGET: 'antifake-production-postgres',
};

describe('UAT safety guards', () => {
  it('accepts an explicitly isolated local UAT database', () => {
    expect(assertUatDatabaseTarget(safeEnvironment)).toMatchObject({
      databaseName: 'antifake_uat',
      hostname: '127.0.0.1',
      target: 'antifake-uat-postgres',
      isolationMethod: 'explicit-target-and-database-name',
    });
  });

  it('requires the same boundary when a runtime is explicitly named UAT', () => {
    expect(assertUatRuntimeDatabaseTarget(safeEnvironment)).toMatchObject({
      target: 'antifake-uat-postgres',
    });
    expect(() =>
      assertUatRuntimeDatabaseTarget({
        ...safeEnvironment,
        DATABASE_URL: 'postgresql://db_user@127.0.0.1:5432/antifake_production',
        UAT_DATABASE_NAME: 'antifake_production',
      }),
    ).toThrow(/UAT|production|database/i);
  });

  it('does not alter ordinary production startup behavior', () => {
    expect(
      assertUatRuntimeDatabaseTarget({
        NODE_ENV: 'production',
        DATABASE_URL: 'not-used',
      }),
    ).toBeUndefined();
  });

  it('accepts a remote database only when its exact host is allowlisted', () => {
    expect(
      assertUatDatabaseTarget({
        ...safeEnvironment,
        DATABASE_URL: 'postgresql://uat_user@uat-db.internal:5432/antifake_uat',
        UAT_DATABASE_HOST_ALLOWLIST: 'uat-db.internal',
      }).hostname,
    ).toBe('uat-db.internal');
  });

  it.each([
    ['missing UAT mode', { UAT_ENVIRONMENT: undefined }],
    ['production mode', { NODE_ENV: 'production' }],
    ['missing isolation confirmation', { UAT_ISOLATION_CONFIRMED: 'false' }],
    ['database name mismatch', { UAT_DATABASE_NAME: 'another_database' }],
    [
      'remote host without allowlist',
      {
        DATABASE_URL: 'postgresql://uat_user@uat-db.internal:5432/antifake_uat',
      },
    ],
    [
      'production database hostname',
      {
        DATABASE_URL:
          'postgresql://uat_user@api.antifake.io.vn:5432/antifake_uat',
      },
    ],
    [
      'unqualified production database subdomain',
      {
        DATABASE_URL:
          'postgresql://uat_user@db.antifake.io.vn:5432/antifake_uat',
        UAT_DATABASE_HOST_ALLOWLIST: 'db.antifake.io.vn',
      },
    ],
    [
      'production-looking database name',
      {
        DATABASE_URL:
          'postgresql://uat_user@127.0.0.1:5432/antifake_production',
        UAT_DATABASE_NAME: 'antifake_production',
      },
    ],
    [
      'same production target label',
      {
        UAT_PRODUCTION_DATABASE_TARGET: 'antifake-uat-postgres',
      },
    ],
  ])('rejects %s', (_caseName, overrides) => {
    expect(() =>
      assertUatDatabaseTarget({ ...safeEnvironment, ...overrides }),
    ).toThrow(/UAT|production|allowlist|database/i);
  });

  it('rejects malformed or production public URLs', () => {
    expect(() => assertUatPublicUrl('not-a-url')).toThrow(/URL/i);
    expect(() => assertUatPublicUrl('https://antifake.io.vn')).toThrow(
      /production/i,
    );
    expect(() => assertUatPublicUrl('https://api.antifake.io.vn')).toThrow(
      /production/i,
    );
  });

  it('rejects placeholder UAT passwords', () => {
    expect(() =>
      requiredUatSecret('UAT_TEST_PASSWORD', {
        UAT_TEST_PASSWORD: 'change-me',
      }),
    ).toThrow(/placeholder/i);
  });

  it.each([
    'http://127.0.0.1:4173',
    'http://localhost:4173',
    'https://uat.antifake.io.vn',
  ])('accepts %s as a UAT public URL', (url) => {
    expect(assertUatPublicUrl(url)).toBe(url);
  });
});
