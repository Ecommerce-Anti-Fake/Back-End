export type UatEnvironment = Record<string, string | undefined>;

export type UatDatabaseTarget = {
  databaseName: string;
  hostname: string;
  target: string;
  productionTarget: string;
  isolationMethod:
    | 'explicit-target-and-database-name'
    | 'explicit-demo-target-and-database-name';
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
    throw new Error(`${name} is required for a UAT fixture operation`);
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

function allowlistedHosts(environment: UatEnvironment, name: string) {
  return (environment[name] ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
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
    const hosts = allowlistedHosts(environment, 'UAT_DATABASE_HOST_ALLOWLIST');

    if (!hosts.includes(hostname)) {
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
 * Allow additive fixture writes to the owner's explicitly classified current
 * demo deployment. This is intentionally separate from the destructive
 * isolated-database guard above: the demo path must prove its classification,
 * target identity and host allowlist, but must never expose the reset command.
 */
function assertUatDemoDatabaseBoundary(
  environment: UatEnvironment,
  requireMutationApproval: boolean,
): UatDatabaseTarget {
  if (environment.ANTIFAKE_CURRENT_ENVIRONMENT?.trim() !== 'UAT_DEMO') {
    throw new Error(
      'ANTIFAKE_CURRENT_ENVIRONMENT=UAT_DEMO is required for the demo runtime',
    );
  }

  if (
    requireMutationApproval &&
    environment.UAT_DEMO_MUTATION_APPROVED?.trim().toLowerCase() !== 'true'
  ) {
    throw new Error(
      'UAT_DEMO_MUTATION_APPROVED=true is required for demo fixture writes',
    );
  }

  const databaseUrl = requiredValue(environment, 'DATABASE_URL');
  const target = requiredValue(environment, 'UAT_DEMO_DATABASE_TARGET');
  const expectedDatabaseName = requiredValue(
    environment,
    'UAT_DEMO_DATABASE_NAME',
  );
  const productionTarget = requiredValue(
    environment,
    'UAT_DEMO_PRODUCTION_DATABASE_TARGET',
  );
  const { databaseName, hostname } = parseDatabaseUrl(databaseUrl);

  if (
    !/(uat|demo|staging|test|local)/i.test(target) ||
    isProductionLooking(target)
  ) {
    throw new Error(
      'UAT_DEMO_DATABASE_TARGET must identify a non-production demo target',
    );
  }

  if (isProductionLooking(expectedDatabaseName)) {
    throw new Error(
      'UAT_DEMO_DATABASE_NAME must not identify a production database',
    );
  }

  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      'DATABASE_URL database name does not match UAT_DEMO_DATABASE_NAME',
    );
  }

  if (target.toLowerCase() === productionTarget.toLowerCase()) {
    throw new Error(
      'UAT_DEMO_DATABASE_TARGET must differ from UAT_DEMO_PRODUCTION_DATABASE_TARGET',
    );
  }

  if (isProductionHost(hostname)) {
    throw new Error('Production database host is not allowed for UAT demo');
  }

  if (!LOCAL_HOSTS.has(hostname)) {
    const hosts = allowlistedHosts(
      environment,
      'UAT_DEMO_DATABASE_HOST_ALLOWLIST',
    );
    if (!hosts.includes(hostname)) {
      throw new Error(
        'Remote demo database host must be in UAT_DEMO_DATABASE_HOST_ALLOWLIST',
      );
    }
  }

  return {
    databaseName,
    hostname,
    target,
    productionTarget,
    isolationMethod: 'explicit-demo-target-and-database-name',
  };
}

export function assertUatDemoDatabaseTarget(
  environment: UatEnvironment = process.env,
): UatDatabaseTarget {
  return assertUatDemoDatabaseBoundary(environment, true);
}

/**
 * Validate the current UAT/demo database before the application boots. This
 * deliberately does not require mutation approval: the runtime must prove its
 * boundary even when fixture writes are disabled.
 */
export function assertUatDemoRuntimeDatabaseTarget(
  environment: UatEnvironment = process.env,
): UatDatabaseTarget {
  return assertUatDemoDatabaseBoundary(environment, false);
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
  const demoMode =
    environment.ANTIFAKE_CURRENT_ENVIRONMENT?.trim() === 'UAT_DEMO';

  if (demoMode) return assertUatDemoRuntimeDatabaseTarget(environment);

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

/**
 * Validate a public URL for the owner's current UAT/demo deployment. The
 * production-looking AntiFake hosts are accepted only when the exact host is
 * explicitly allowlisted under the UAT_DEMO classification.
 */
export function assertUatDemoPublicUrl(
  value: string,
  environment: UatEnvironment = process.env,
) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error('UAT demo public URL must be a valid URL');
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      'UAT demo public URL must be an HTTP(S) URL without credentials',
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const approvedDemoHosts = allowlistedHosts(
    environment,
    'UAT_APPROVED_PUBLIC_HOSTS',
  );
  const isApprovedDemoHost =
    environment.ANTIFAKE_CURRENT_ENVIRONMENT?.trim() === 'UAT_DEMO' &&
    approvedDemoHosts.includes(hostname);

  if (isProductionHost(hostname) && !isApprovedDemoHost) {
    throw new Error(
      'Production public URL requires an explicitly approved UAT_DEMO host',
    );
  }

  if (
    !LOCAL_HOSTS.has(hostname) &&
    !/(uat|staging|test)/i.test(hostname) &&
    !isApprovedDemoHost
  ) {
    throw new Error(
      'UAT demo public URL must use a local, explicitly non-production or approved demo hostname',
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
