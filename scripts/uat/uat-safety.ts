export type UatEnvironment = Record<string, string | undefined>;

export type UatDatabaseTarget = {
  databaseName: string;
  hostname: string;
  target: string;
  productionTarget: string;
  isolationMethod: 'explicit-target-and-database-name';
};

const PRODUCTION_HOSTS = new Set([
  'antifake.io.vn',
  'www.antifake.io.vn',
  'api.antifake.io.vn',
]);

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function isProductionHost(hostname: string) {
  return (
    PRODUCTION_HOSTS.has(hostname) ||
    (hostname.endsWith('.antifake.io.vn') &&
      !/(^|[.-])(uat|staging|test)([.-]|$)/i.test(hostname))
  );
}

function requiredValue(environment: UatEnvironment, name: string) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for a destructive UAT operation`);
  }
  return value;
}

function isProductionLooking(value: string) {
  return /(^|[-_])(prod|production)([-_]|$)/i.test(value);
}

function parseDatabaseUrl(databaseUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(
      'DATABASE_URL must use the postgres or postgresql protocol',
    );
  }

  const databaseName = decodeURIComponent(
    parsed.pathname.replace(/^\//, ''),
  ).trim();
  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name');
  }

  return {
    databaseName,
    hostname: parsed.hostname.toLowerCase(),
  };
}

export function assertUatDatabaseTarget(
  environment: UatEnvironment = process.env,
): UatDatabaseTarget {
  if (environment.UAT_ENVIRONMENT?.trim().toLowerCase() !== 'true') {
    throw new Error(
      'UAT_ENVIRONMENT=true is required for a destructive UAT operation',
    );
  }

  if (environment.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new Error(
      'Production NODE_ENV is not allowed for UAT fixture operations',
    );
  }

  if (environment.UAT_ISOLATION_CONFIRMED?.trim().toLowerCase() !== 'true') {
    throw new Error(
      'UAT_ISOLATION_CONFIRMED=true is required before using the UAT database',
    );
  }

  const databaseUrl = requiredValue(environment, 'DATABASE_URL');
  const target = requiredValue(environment, 'UAT_DATABASE_TARGET');
  const expectedDatabaseName = requiredValue(environment, 'UAT_DATABASE_NAME');
  const productionTarget = requiredValue(
    environment,
    'UAT_PRODUCTION_DATABASE_TARGET',
  );
  const { databaseName, hostname } = parseDatabaseUrl(databaseUrl);

  if (!/(uat|staging|test|local)/i.test(target)) {
    throw new Error(
      'UAT_DATABASE_TARGET must identify an isolated UAT, staging, test or local target',
    );
  }

  if (
    !/(uat|staging|test|local)/i.test(expectedDatabaseName) ||
    isProductionLooking(expectedDatabaseName)
  ) {
    throw new Error(
      'UAT_DATABASE_NAME must identify a non-production UAT database',
    );
  }

  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      'DATABASE_URL database name does not match UAT_DATABASE_NAME',
    );
  }

  if (isProductionLooking(target) || isProductionLooking(databaseName)) {
    throw new Error(
      'Production-looking database targets are not allowed for UAT',
    );
  }

  if (target.toLowerCase() === productionTarget.toLowerCase()) {
    throw new Error(
      'UAT_DATABASE_TARGET must differ from UAT_PRODUCTION_DATABASE_TARGET',
    );
  }

  if (isProductionHost(hostname)) {
    throw new Error('Production database host is not allowed for UAT');
  }

  if (!LOCAL_HOSTS.has(hostname)) {
    const allowlistedHosts = (environment.UAT_DATABASE_HOST_ALLOWLIST ?? '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (!allowlistedHosts.includes(hostname)) {
      throw new Error(
        'Remote UAT database host must be in UAT_DATABASE_HOST_ALLOWLIST',
      );
    }
  }

  return {
    databaseName,
    hostname,
    target,
    productionTarget,
    isolationMethod: 'explicit-target-and-database-name',
  };
}

/**
 * Keep normal production startup unchanged while making any explicitly UAT
 * process prove its database boundary before the application boots.
 */
export function assertUatRuntimeDatabaseTarget(
  environment: UatEnvironment = process.env,
) {
  const uatMode = environment.UAT_ENVIRONMENT?.trim().toLowerCase() === 'true';
  const namedUatNodeEnvironment =
    environment.NODE_ENV?.trim().toLowerCase() === 'uat';

  if (!uatMode && !namedUatNodeEnvironment) {
    return undefined;
  }

  return assertUatDatabaseTarget(environment);
}

export function assertUatPublicUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error('UAT public URL must be a valid URL');
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      'UAT public URL must be an HTTP(S) URL without credentials',
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isProductionHost(hostname)) {
    throw new Error(
      'Production public URL is not allowed for UAT browser automation',
    );
  }

  if (!LOCAL_HOSTS.has(hostname) && !/(uat|staging|test)/i.test(hostname)) {
    throw new Error(
      'UAT public URL must use a local or explicitly non-production hostname',
    );
  }

  return value;
}

export function requiredUatSecret(
  name: string,
  environment: UatEnvironment = process.env,
) {
  const value = requiredValue(environment, name);
  if (
    name === 'UAT_TEST_PASSWORD' &&
    /^(changeme|change-me|password|example|test)$/i.test(value)
  ) {
    throw new Error(
      'UAT_TEST_PASSWORD must be a non-placeholder injected value',
    );
  }
  return value;
}
