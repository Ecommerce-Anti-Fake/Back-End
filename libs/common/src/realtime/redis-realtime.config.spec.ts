import {
  REALTIME_REDIS_KEY_TTLS_SECONDS,
  REALTIME_REDIS_NAMESPACES,
  buildRealtimeRedisKey,
  resolveRedisRealtimeConfig,
} from './redis-realtime.config';
import { createSocketIoRedisAdapter } from './socket-io-redis-adapter.factory';

describe('resolveRedisRealtimeConfig', () => {
  it('keeps Redis disabled when no realtime Redis env is configured', () => {
    const config = resolveRedisRealtimeConfig({});

    expect(config.enabled).toBe(false);
    expect(config.url).toBeNull();
    expect(config.mode).toBe('disabled');
  });

  it('enables Redis from REDIS_URL unless explicitly disabled', () => {
    const config = resolveRedisRealtimeConfig({
      REDIS_URL: ' redis://prod-redis:6379/2 ',
      REDIS_KEY_PREFIX: 'acf',
      REDIS_DEFAULT_TTL_SECONDS: '120',
    });

    expect(config).toMatchObject({
      enabled: true,
      mode: 'url',
      url: 'redis://prod-redis:6379/2',
      keyPrefix: 'acf',
      defaultTtlSeconds: 120,
    });
  });

  it('uses localhost fallback only when Redis is explicitly enabled', () => {
    const config = resolveRedisRealtimeConfig({
      REDIS_ENABLED: 'true',
    });

    expect(config.enabled).toBe(true);
    expect(config.mode).toBe('local-fallback');
    expect(config.url).toBe('redis://127.0.0.1:6379/0');
  });

  it('lets REDIS_ENABLED=false disable Redis even when REDIS_URL exists', () => {
    const config = resolveRedisRealtimeConfig({
      REDIS_ENABLED: 'false',
      REDIS_URL: 'redis://prod-redis:6379/2',
    });

    expect(config.enabled).toBe(false);
    expect(config.url).toBeNull();
    expect(config.mode).toBe('disabled');
  });

  it('keeps ephemeral namespaces and TTL-bearing key conventions centralized', () => {
    expect(REALTIME_REDIS_NAMESPACES).toMatchObject({
      socketIoAdapter: 'rt:socket-io',
      pubSub: 'rt:pubsub',
      rateLimit: 'rt:rate-limit',
      presence: 'rt:presence',
      session: 'rt:session',
      liveCounter: 'rt:live-counter',
      cache: 'rt:cache',
    });
    expect(REALTIME_REDIS_KEY_TTLS_SECONDS.presence).toBeGreaterThan(0);
    expect(REALTIME_REDIS_KEY_TTLS_SECONDS.liveCounter).toBeGreaterThan(0);
    expect(buildRealtimeRedisKey('presence', ['user', 'user-1'], 'acf')).toBe('acf:rt:presence:user:user-1');
  });

  it('does not create a Socket.IO Redis adapter when Redis is disabled', async () => {
    await expect(createSocketIoRedisAdapter(resolveRedisRealtimeConfig({}))).resolves.toBeNull();
  });
});
