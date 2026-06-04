export type RealtimeRedisMode = 'disabled' | 'url' | 'host-port' | 'local-fallback';

export type RealtimeRedisNamespace = keyof typeof REALTIME_REDIS_NAMESPACES;

export type RealtimeRedisConfigInput = Record<string, string | number | boolean | undefined | null>;

export type RealtimeRedisConfig = {
  enabled: boolean;
  mode: RealtimeRedisMode;
  url: string | null;
  keyPrefix: string;
  defaultTtlSeconds: number;
  connectionName: string;
};

export const REALTIME_REDIS_NAMESPACES = {
  socketIoAdapter: 'rt:socket-io',
  pubSub: 'rt:pubsub',
  rateLimit: 'rt:rate-limit',
  presence: 'rt:presence',
  session: 'rt:session',
  liveCounter: 'rt:live-counter',
  cache: 'rt:cache',
} as const;

export const REALTIME_REDIS_KEY_TTLS_SECONDS = {
  rateLimit: 60,
  presence: 45,
  session: 900,
  typing: 8,
  liveCounter: 300,
  cache: 300,
} as const;

export const REALTIME_OPERATION_METRICS = {
  websocketConnections: 'realtime.websocket.connections',
  websocketConnectionErrors: 'realtime.websocket.connection_errors',
  websocketPresenceHeartbeats: 'realtime.websocket.presence_heartbeats',
  websocketTypingEvents: 'realtime.websocket.typing_events',
  sseReconnects: 'realtime.sse.reconnects',
  rateLimitHits: 'realtime.rate_limit.hits',
  failedDeliveries: 'realtime.delivery.failed',
} as const;

const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;
const DEFAULT_KEY_PREFIX = 'acf';
const DEFAULT_TTL_SECONDS = 300;

export function resolveRedisRealtimeConfig(env: RealtimeRedisConfigInput): RealtimeRedisConfig {
  const explicitEnabled = parseBoolean(env.REDIS_ENABLED);

  if (explicitEnabled === false) {
    return disabledConfig(env);
  }

  const url = readString(env.REDIS_URL);
  if (url) {
    return enabledConfig(env, 'url', url);
  }

  const host = readString(env.REDIS_HOST);
  if (host) {
    const port = readPositiveInt(env.REDIS_PORT, DEFAULT_REDIS_PORT);
    const db = readNonNegativeInt(env.REDIS_DB, DEFAULT_REDIS_DB);

    return enabledConfig(env, 'host-port', `redis://${host}:${port}/${db}`);
  }

  if (explicitEnabled === true) {
    const port = readPositiveInt(env.REDIS_PORT, DEFAULT_REDIS_PORT);
    const db = readNonNegativeInt(env.REDIS_DB, DEFAULT_REDIS_DB);

    return enabledConfig(env, 'local-fallback', `redis://${DEFAULT_REDIS_HOST}:${port}/${db}`);
  }

  return disabledConfig(env);
}

export function buildRealtimeRedisKey(
  namespace: RealtimeRedisNamespace,
  parts: Array<string | number>,
  keyPrefix = DEFAULT_KEY_PREFIX,
) {
  const safeParts = parts.map((part) => encodeKeyPart(String(part)));

  return [keyPrefix, REALTIME_REDIS_NAMESPACES[namespace], ...safeParts].filter(Boolean).join(':');
}

function enabledConfig(env: RealtimeRedisConfigInput, mode: Exclude<RealtimeRedisMode, 'disabled'>, url: string) {
  return {
    enabled: true,
    mode,
    url: url.trim(),
    keyPrefix: readString(env.REDIS_KEY_PREFIX) ?? DEFAULT_KEY_PREFIX,
    defaultTtlSeconds: readPositiveInt(env.REDIS_DEFAULT_TTL_SECONDS, DEFAULT_TTL_SECONDS),
    connectionName: readString(env.REDIS_CONNECTION_NAME) ?? 'acf-realtime',
  };
}

function disabledConfig(env: RealtimeRedisConfigInput): RealtimeRedisConfig {
  return {
    enabled: false,
    mode: 'disabled',
    url: null,
    keyPrefix: readString(env.REDIS_KEY_PREFIX) ?? DEFAULT_KEY_PREFIX,
    defaultTtlSeconds: readPositiveInt(env.REDIS_DEFAULT_TTL_SECONDS, DEFAULT_TTL_SECONDS),
    connectionName: readString(env.REDIS_CONNECTION_NAME) ?? 'acf-realtime',
  };
}

function parseBoolean(value: string | number | boolean | undefined | null) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = readString(value)?.toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized ?? '')) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized ?? '')) {
    return false;
  }

  return undefined;
}

function readString(value: string | number | boolean | undefined | null) {
  const text = value === undefined || value === null ? '' : String(value).trim();

  return text || undefined;
}

function readPositiveInt(value: string | number | boolean | undefined | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readNonNegativeInt(value: string | number | boolean | undefined | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function encodeKeyPart(part: string) {
  return part.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
}
