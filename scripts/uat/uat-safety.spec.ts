import {
  assertUatDatabaseTarget,
  assertUatDemoDatabaseTarget,
  assertUatDemoDataClassificationConfirmed,
  assertUatDemoFixturePolicy,
  assertUatDemoPublicUrl,
  assertUatDemoRuntimeDatabaseTarget,
  assertUatPublicUrl,
  assertUatRuntimeDatabaseTarget,
  assertUatRuntimePublicUrl,
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

const safeDemoEnvironment = {
  ANTIFAKE_CURRENT_ENVIRONMENT: 'UAT_DEMO',
  UAT_DEMO_MUTATION_APPROVED: 'true',
  UAT_DEMO_LEGACY_DATA_ACKNOWLEDGED: 'true',
  UAT_DEMO_LEGACY_DATA_CUTOFF: '2026-09-04T00:00:00.000Z',
  UAT_DEMO_FIXTURE_NAMESPACE: 'DOCS_UAT',
  UAT_DEMO_FIXTURE_MODE: 'ADDITIVE_IDEMPOTENT',
  UAT_DEMO_DESTRUCTIVE_RESET_ALLOWED: 'false',
  UAT_DEMO_LEGACY_MUTATION_ALLOWED: 'false',
  UAT_DEMO_REAL_PAYMENT_ALLOWED: 'false',
  UAT_DEMO_REAL_PAYOUT_ALLOWED: 'false',
  UAT_DEMO_REAL_SHIPMENT_ALLOWED: 'false',
  UAT_DEMO_REAL_EXTERNAL_KYC_ALLOWED: 'false',
  UAT_DEMO_REAL_LIVESTREAM_ALLOWED: 'false',
  DATABASE_URL: 'postgresql://demo_user@demo-db.internal:5432/antifake_demo',
  UAT_DEMO_DATABASE_TARGET: 'antifake-demo-database',
  UAT_DEMO_DATABASE_NAME: 'antifake_demo',
  UAT_DEMO_DATABASE_HOST_ALLOWLIST: 'demo-db.internal',
  UAT_DEMO_PRODUCTION_DATABASE_TARGET: 'antifake-customer-database',
  UAT_APPROVED_PUBLIC_HOSTS: 'antifake.io.vn,www.antifake.io.vn',
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

  it('accepts the explicitly classified existing UAT demo database', () => {
    expect(assertUatDemoDatabaseTarget(safeDemoEnvironment)).toMatchObject({
      databaseName: 'antifake_demo',
      hostname: 'demo-db.internal',
      target: 'antifake-demo-database',
      isolationMethod: 'explicit-demo-target-and-database-name',
    });
  });

  it('requires explicit owner classification before fixture writes', () => {
    expect(() =>
      assertUatDemoDataClassificationConfirmed({
        ...safeDemoEnvironment,
        UAT_DEMO_LEGACY_DATA_ACKNOWLEDGED: 'false',
      }),
    ).toThrow(/LEGACY_DATA_ACKNOWLEDGED|classification/i);
  });

  it('requires the additive DOCS_UAT safety policy', () => {
    expect(assertUatDemoFixturePolicy(safeDemoEnvironment)).toMatchObject({
      namespace: 'DOCS_UAT',
      mode: 'ADDITIVE_IDEMPOTENT',
      destructiveResetAllowed: false,
      legacyMutationAllowed: false,
    });
    expect(() =>
      assertUatDemoFixturePolicy({
        ...safeDemoEnvironment,
        UAT_DEMO_LEGACY_MUTATION_ALLOWED: 'true',
      }),
    ).toThrow(/LEGACY_MUTATION_ALLOWED/i);
  });

  it('protects an explicitly classified UAT demo runtime without enabling writes', () => {
    const runtimeEnvironment = {
      ...safeDemoEnvironment,
      UAT_DEMO_MUTATION_APPROVED: 'false',
    };
    expect(
      assertUatDemoRuntimeDatabaseTarget(runtimeEnvironment),
    ).toMatchObject({
      target: 'antifake-demo-database',
    });
    expect(
      assertUatRuntimeDatabaseTarget({
        ...runtimeEnvironment,
        NODE_ENV: 'production',
      }),
    ).toMatchObject({ target: 'antifake-demo-database' });
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

  it('allows the owner-approved demo hosts only with explicit UAT_DEMO classification', () => {
    expect(
      assertUatDemoPublicUrl('https://antifake.io.vn', safeDemoEnvironment),
    ).toBe('https://antifake.io.vn');
    expect(() => assertUatDemoPublicUrl('https://antifake.io.vn')).toThrow(
      /UAT_DEMO/i,
    );
    expect(() =>
      assertUatDemoPublicUrl('https://api.antifake.io.vn', safeDemoEnvironment),
    ).toThrow(/approved|host/i);
  });

  it('uses the demo host guard when starting the approved UAT demo runtime', () => {
    expect(
      assertUatRuntimePublicUrl('https://antifake.io.vn', safeDemoEnvironment),
    ).toBe('https://antifake.io.vn');
    expect(() =>
      assertUatRuntimePublicUrl('https://antifake.io.vn', {
        ...safeDemoEnvironment,
        ANTIFAKE_CURRENT_ENVIRONMENT: 'UAT_DEMO_UNCONFIRMED',
      }),
    ).toThrow(/production|UAT/i);
  });

  it.each([
    [
      'missing environment classification',
      { ANTIFAKE_CURRENT_ENVIRONMENT: '' },
    ],
    ['missing mutation approval', { UAT_DEMO_MUTATION_APPROVED: 'false' }],
    ['database name mismatch', { UAT_DEMO_DATABASE_NAME: 'other_demo' }],
    [
      'unallowlisted demo database host',
      {
        DATABASE_URL:
          'postgresql://demo_user@other-db.internal:5432/antifake_demo',
      },
    ],
    [
      'production-looking demo target',
      { UAT_DEMO_DATABASE_TARGET: 'antifake-production-database' },
    ],
  ])('rejects demo target with %s', (_caseName, overrides) => {
    expect(() =>
      assertUatDemoDatabaseTarget({ ...safeDemoEnvironment, ...overrides }),
    ).toThrow(/UAT|demo|production|database|allowlist/i);
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
