import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';
import { buildRealtimeRedisKey } from './redis-realtime.config';

export const LIVE_PUBLISHER_LEASE_TTL_SECONDS = 45;
export const LIVE_PUBLISHER_LEASE_HEARTBEAT_INTERVAL_MS = 15_000;

type PublisherLeaseInput = {
  sessionId: string;
  requesterUserId: string;
  clientId: string;
};

type LocalLease = {
  value: string;
  expiresAt: number;
};

const REFRESH_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("EXPIRE", KEYS[1], ARGV[2])
end
return 0
`;

const DELETE_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

@Injectable()
export class RealtimePublisherLeaseService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePublisherLeaseService.name);
  private redis: RedisClientType | null = null;
  private redisReady = false;
  private redisInitPromise: Promise<void> | null = null;
  private readonly localStore = new Map<string, LocalLease>();

  constructor(
    private readonly redisRealtimeConfigService: RedisRealtimeConfigService,
  ) {}

  async claim(input: PublisherLeaseInput) {
    const key = this.key(input.sessionId);
    const value = this.value(input);
    const redis = await this.getRedis();
    if (redis) {
      const acquired = await redis.set(key, value, {
        EX: LIVE_PUBLISHER_LEASE_TTL_SECONDS,
        NX: true,
      });
      if (acquired === 'OK') {
        return true;
      }
      const existing = await redis.get(key);
      if (existing !== value) {
        return false;
      }
      return this.refreshRedis(redis, key, value);
    }

    this.assertLocalFallbackAllowed();
    this.purgeExpiredLocal();
    const existing = this.localStore.get(key);
    if (existing && existing.value !== value) {
      return false;
    }
    this.localStore.set(key, {
      value,
      expiresAt: Date.now() + LIVE_PUBLISHER_LEASE_TTL_SECONDS * 1000,
    });
    return true;
  }

  async heartbeat(input: PublisherLeaseInput) {
    const key = this.key(input.sessionId);
    const value = this.value(input);
    const redis = await this.getRedis();
    if (redis) {
      return this.refreshRedis(redis, key, value);
    }

    this.assertLocalFallbackAllowed();
    this.purgeExpiredLocal();
    const existing = this.localStore.get(key);
    if (!existing || existing.value !== value) {
      return false;
    }
    existing.expiresAt = Date.now() + LIVE_PUBLISHER_LEASE_TTL_SECONDS * 1000;
    return true;
  }

  async release(input: PublisherLeaseInput) {
    const key = this.key(input.sessionId);
    const value = this.value(input);
    const redis = await this.getRedis();
    if (redis) {
      const deleted = await redis.eval(DELETE_IF_OWNER_SCRIPT, {
        keys: [key],
        arguments: [value],
      });
      return Number(deleted) === 1;
    }

    this.assertLocalFallbackAllowed();
    this.purgeExpiredLocal();
    const existing = this.localStore.get(key);
    if (!existing || existing.value !== value) {
      return false;
    }
    this.localStore.delete(key);
    return true;
  }

  async forceRelease(sessionId: string) {
    const key = this.key(sessionId);
    const redis = await this.getRedis();
    if (redis) {
      await redis.del(key);
      return;
    }
    this.assertLocalFallbackAllowed();
    this.localStore.delete(key);
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
    this.redis = null;
    this.redisReady = false;
    this.redisInitPromise = null;
  }

  private async refreshRedis(
    redis: RedisClientType,
    key: string,
    value: string,
  ) {
    const refreshed = await redis.eval(REFRESH_IF_OWNER_SCRIPT, {
      keys: [key],
      arguments: [value, String(LIVE_PUBLISHER_LEASE_TTL_SECONDS)],
    });
    return Number(refreshed) === 1;
  }

  private async getRedis() {
    if (this.redisReady) {
      return this.redis;
    }
    if (!this.redisInitPromise) {
      const initPromise = this.initRedis();
      this.redisInitPromise = initPromise;
      void initPromise.finally(() => {
        if (this.redisInitPromise === initPromise) {
          this.redisInitPromise = null;
        }
      });
    }
    await this.redisInitPromise;
    return this.redisReady ? this.redis : null;
  }

  private async initRedis() {
    const config = this.redisRealtimeConfigService.getConfig();
    if (!config.enabled || !config.url) {
      return;
    }
    const redis = createClient({
      url: config.url,
      name: `${config.connectionName}:live-publisher-lease`,
    }) as RedisClientType;
    try {
      await redis.connect();
      this.redis = redis;
      this.redisReady = true;
    } catch {
      await redis.quit().catch(() => undefined);
      this.logger.warn(
        'Redis publisher lease unavailable; local fallback is development-only',
      );
    }
  }

  private assertLocalFallbackAllowed() {
    if (process.env.NODE_ENV?.trim().toLowerCase() === 'production') {
      throw new ServiceUnavailableException(
        'Redis is required for live publisher leases in production',
      );
    }
  }

  private key(sessionId: string) {
    const config = this.redisRealtimeConfigService.getConfig();
    return buildRealtimeRedisKey(
      'session',
      ['live', sessionId, 'publisher'],
      config.keyPrefix,
    );
  }

  private value(input: PublisherLeaseInput) {
    return JSON.stringify({
      requesterUserId: input.requesterUserId,
      clientId: input.clientId,
    });
  }

  private purgeExpiredLocal() {
    const now = Date.now();
    for (const [key, lease] of this.localStore.entries()) {
      if (lease.expiresAt <= now) {
        this.localStore.delete(key);
      }
    }
  }
}
