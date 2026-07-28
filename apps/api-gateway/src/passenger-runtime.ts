import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { join } from 'node:path';

export type RuntimeEnvironment = Record<string, string | undefined>;

export type EmbeddedServicePorts = {
  auth: number;
  users: number;
  catalog: number;
  orders: number;
  affiliate: number;
};

export type PassengerEnvironment = {
  httpPort: number;
  servicePorts: EmbeddedServicePorts;
};

type ProcessLockOwner = {
  pid: number;
  token: string;
  startedAt: string;
};

export type PassengerProcessLock = {
  path: string;
  release: () => void;
};

type Closable = {
  close: () => Promise<unknown>;
};

export type HttpServerLike = EventEmitter & {
  listen: (...args: unknown[]) => unknown;
};

const servicePortDefinitions = [
  ['auth', 'AUTH_SERVICE_PORT', 4001],
  ['users', 'USERS_SERVICE_PORT', 4002],
  ['catalog', 'CATALOG_SERVICE_PORT', 4003],
  ['orders', 'ORDERS_SERVICE_PORT', 4004],
  ['affiliate', 'AFFILIATE_SERVICE_PORT', 4005],
] as const;

export function resolveEmbeddedServicePorts(
  environment: RuntimeEnvironment,
): EmbeddedServicePorts {
  const ports = Object.fromEntries(
    servicePortDefinitions.map(([name, environmentName, fallback]) => [
      name,
      parsePort(
        environment[environmentName] ?? String(fallback),
        environmentName,
      ),
    ]),
  ) as EmbeddedServicePorts;

  if (new Set(Object.values(ports)).size !== servicePortDefinitions.length) {
    throw new Error('Internal TCP service ports must be unique');
  }

  return ports;
}

export function resolveHttpPort(
  value: string | undefined,
  fallback?: number,
): number {
  return parsePort(
    value ?? (fallback === undefined ? undefined : String(fallback)),
    'PORT',
  );
}

export function validatePassengerEnvironment(
  environment: RuntimeEnvironment,
): PassengerEnvironment {
  const missing: string[] = [];

  requireValue(environment, 'DATABASE_URL', missing);
  requireValue(environment, 'JWT_SECRET', missing);
  requireValue(environment, 'REFRESH_TOKEN_SECRET', missing);
  requireOneOf(
    environment,
    ['FRONTEND_URL', 'CORS_ALLOWED_ORIGINS', 'CORS_ORIGIN'],
    'FRONTEND_URL or CORS_ALLOWED_ORIGINS or CORS_ORIGIN',
    missing,
  );
  requireOneOf(
    environment,
    ['BACKEND_PUBLIC_URL', 'API_PUBLIC_URL'],
    'BACKEND_PUBLIC_URL or API_PUBLIC_URL',
    missing,
  );

  for (const name of [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'AGORA_APP_ID',
    'AGORA_APP_CERTIFICATE',
    'AGORA_RTC_TOKEN_TTL_SECONDS',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'PAYOS_CLIENT_ID',
    'PAYOS_API_KEY',
    'GHN_TOKEN',
    'GHN_SHOP_ID',
  ]) {
    requireValue(environment, name, missing);
  }
  requireOneOf(
    environment,
    ['PAYOS_CHECK_SUM_KEY', 'PAYOS_CHECKSUM_KEY'],
    'PAYOS_CHECK_SUM_KEY or PAYOS_CHECKSUM_KEY',
    missing,
  );

  if (isEnabled(environment.REDIS_ENABLED)) {
    requireOneOf(
      environment,
      ['REDIS_URL', 'REDIS_HOST'],
      'REDIS_URL or REDIS_HOST',
      missing,
    );
  }

  if (isEnabled(environment.BANK_ACCOUNT_LOOKUP_ENABLED)) {
    requireValue(environment, 'VIETQR_CLIENT_ID', missing);
    requireValue(environment, 'VIETQR_API_KEY', missing);
  }

  if (
    isEnabled(environment.SELLER_WITHDRAWALS_ENABLED) ||
    isEnabled(environment.BUYER_WITHDRAWALS_ENABLED)
  ) {
    requireValue(environment, 'PAYOUT_ACCOUNT_ENCRYPTION_KEY', missing);
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Passenger configuration: ${missing.join(', ')}`,
    );
  }

  const httpPort = resolveHttpPort(environment.PORT);
  const servicePorts = resolveEmbeddedServicePorts(environment);
  if (Object.values(servicePorts).includes(httpPort)) {
    throw new Error('PORT must not reuse an internal TCP service port');
  }

  return { httpPort, servicePorts };
}

export function acquirePassengerProcessLock(options?: {
  appRoot?: string;
  pid?: number;
  isProcessAlive?: (pid: number) => boolean;
}): PassengerProcessLock {
  const appRoot = options?.appRoot ?? process.cwd();
  const pid = options?.pid ?? process.pid;
  const isProcessAlive = options?.isProcessAlive ?? defaultIsProcessAlive;
  const lockDirectory = join(appRoot, 'tmp');
  const lockPath = join(lockDirectory, 'antifake-passenger-tcp.lock');
  const owner: ProcessLockOwner = {
    pid,
    token: randomUUID(),
    startedAt: new Date().toISOString(),
  };

  mkdirSync(lockDirectory, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(lockPath, 'wx', 0o600);
      try {
        writeFileSync(descriptor, JSON.stringify(owner), 'utf8');
      } finally {
        closeSync(descriptor);
      }
      return {
        path: lockPath,
        release: createLockRelease(lockPath, owner.token),
      };
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }

      const existingOwner = readLockOwner(lockPath);
      if (existingOwner && isProcessAlive(existingOwner.pid)) {
        throw new Error(
          `Passenger must run exactly one application process; worker PID ${existingOwner.pid} already owns the internal TCP services`,
        );
      }

      try {
        unlinkSync(lockPath);
      } catch (unlinkError) {
        if (!isFileMissingError(unlinkError)) {
          throw unlinkError;
        }
      }
    }
  }

  throw new Error('Could not acquire the Passenger TCP service process lock');
}

export function createAsyncSingleton<T>(
  factory: () => Promise<T>,
): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= factory();
    return pending;
  };
}

export function createIdempotentShutdown(
  gateway: Closable | undefined,
  microservices: Closable[],
): () => Promise<void> {
  let pending: Promise<void> | undefined;
  return () => {
    pending ??= (async () => {
      const errors: unknown[] = [];
      const resources = [
        ...(gateway ? [gateway] : []),
        ...[...microservices].reverse(),
      ];

      for (const resource of resources) {
        try {
          await resource.close();
        } catch (error) {
          errors.push(error);
        }
      }

      if (errors.length > 0) {
        throw new AggregateError(
          errors,
          'One or more deployment resources failed to close',
        );
      }
    })();
    return pending;
  };
}

export async function listenHttpServer(
  server: HttpServerLike,
  port: number,
  host?: string,
) {
  await new Promise<void>((resolve, reject) => {
    const handleError = (error: unknown) => {
      server.off('error', handleError);
      reject(
        error instanceof Error
          ? error
          : new Error('HTTP server failed to start', { cause: error }),
      );
    };
    const handleListening = () => {
      server.off('error', handleError);
      resolve();
    };

    server.once('error', handleError);
    if (host) {
      server.listen(port, host, handleListening);
    } else {
      server.listen(port, handleListening);
    }
  });
}

export function describeBindError(error: unknown, target?: string): unknown {
  if (!hasErrorCode(error, 'EADDRINUSE')) {
    return error;
  }

  const detail = target ? ` (${target})` : '';
  return new Error(
    `Internal service port is already in use${detail}. Passenger must run exactly one application process.`,
    { cause: error },
  );
}

function parsePort(value: string | undefined, name: string) {
  const normalized = value?.trim() ?? '';
  const port = Number(normalized);
  if (!normalized || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return port;
}

function requireValue(
  environment: RuntimeEnvironment,
  name: string,
  missing: string[],
) {
  if (!environment[name]?.trim()) {
    missing.push(name);
  }
}

function requireOneOf(
  environment: RuntimeEnvironment,
  names: string[],
  label: string,
  missing: string[],
) {
  if (!names.some((name) => environment[name]?.trim())) {
    missing.push(label);
  }
}

function isEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

function defaultIsProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !hasErrorCode(error, 'ESRCH');
  }
}

function readLockOwner(lockPath: string): ProcessLockOwner | null {
  try {
    const value = JSON.parse(
      readFileSync(lockPath, 'utf8'),
    ) as Partial<ProcessLockOwner>;
    return Number.isInteger(value.pid) &&
      typeof value.token === 'string' &&
      typeof value.startedAt === 'string'
      ? (value as ProcessLockOwner)
      : null;
  } catch {
    return null;
  }
}

function createLockRelease(lockPath: string, token: string) {
  return () => {
    const currentOwner = readLockOwner(lockPath);
    if (!currentOwner) {
      return;
    }
    if (currentOwner.token !== token) {
      return;
    }

    try {
      unlinkSync(lockPath);
    } catch (error) {
      if (!isFileMissingError(error)) {
        throw error;
      }
    }
  };
}

function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return hasErrorCode(error, 'EEXIST');
}

function isFileMissingError(error: unknown): error is NodeJS.ErrnoException {
  return hasErrorCode(error, 'ENOENT');
}

function hasErrorCode(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
