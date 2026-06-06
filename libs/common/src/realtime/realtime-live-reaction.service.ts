import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';
import {
  REALTIME_REDIS_KEY_TTLS_SECONDS,
  buildRealtimeRedisKey,
  type RealtimeRedisConfig,
} from './redis-realtime.config';

export const LIVE_REACTION_TYPES = ['LIKE', 'LOVE', 'WOW', 'FIRE'] as const;
export type LiveReactionType = (typeof LIVE_REACTION_TYPES)[number];

export type LiveReactionAggregate = {
  liveSessionId: string;
  totals: Record<LiveReactionType, number>;
  total: number;
};

const RATE_LIMIT_WINDOW_SECONDS = 10;
const RATE_LIMIT_MAX_EVENTS = 12;

type LocalEntry = {
  value: number;
  expiresAt: number;
};

@Injectable()
export class RealtimeLiveReactionService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeLiveReactionService.name);
  private redis: RedisClientType | null = null;
  private redisReady = false;
  private redisInitPromise: Promise<void> | null = null;
  private readonly localCounters = new Map<string, LocalEntry>();

  constructor(private readonly redisRealtimeConfigService: RedisRealtimeConfigService) {}

  async recordReaction(input: { liveSessionId: string; userId: string; reactionType: LiveReactionType }) {
    const rateKey = this.rateLimitKey(input.liveSessionId, input.userId);
    const rateCount = await this.increment(rateKey, RATE_LIMIT_WINDOW_SECONDS);
    if (rateCount > RATE_LIMIT_MAX_EVENTS) {
      return {
        accepted: false,
        reason: 'rate_limited' as const,
        aggregate: await this.getAggregate(input.liveSessionId),
      };
    }

    await this.increment(this.counterKey(input.liveSessionId, input.reactionType), REALTIME_REDIS_KEY_TTLS_SECONDS.liveCounter);

    return {
      accepted: true,
      reason: null,
      aggregate: await this.getAggregate(input.liveSessionId),
    };
  }

  async getAggregate(liveSessionId: string): Promise<LiveReactionAggregate> {
    const totals = {} as Record<LiveReactionType, number>;
    let total = 0;
    for (const reactionType of LIVE_REACTION_TYPES) {
      const count = await this.getNumber(this.counterKey(liveSessionId, reactionType));
      totals[reactionType] = count;
      total += count;
    }

    return { liveSessionId, totals, total };
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
    this.redis = null;
    this.redisReady = false;
    this.redisInitPromise = null;
  }

  private async increment(key: string, ttlSeconds: number) {
    const redis = await this.getRedis();
    if (redis) {
      const value = await redis.incr(key);
      await redis.expire(key, ttlSeconds);
      return value;
    }

    this.purgeExpiredLocal();
    const existing = this.localCounters.get(key);
    const nextValue = (existing?.value ?? 0) + 1;
    this.localCounters.set(key, {
      value: nextValue,
      expiresAt: existing?.expiresAt && existing.expiresAt > this.now() ? existing.expiresAt : this.now() + ttlSeconds * 1000,
    });
    return nextValue;
  }

  private async getNumber(key: string) {
    const redis = await this.getRedis();
    if (redis) {
      const value = await redis.get(key);
      return value ? Number(value) || 0 : 0;
    }

    this.purgeExpiredLocal();
    return this.localCounters.get(key)?.value ?? 0;
  }

  private async getRedis() {
    if (this.redisReady) {
      return this.redis;
    }
    if (!this.redisInitPromise) {
      this.redisInitPromise = this.initRedis();
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
      name: `${config.connectionName}:live-reactions`,
    }) as RedisClientType;

    try {
      await redis.connect();
      this.redis = redis;
      this.redisReady = true;
    } catch (error) {
      await redis.quit().catch(() => undefined);
      this.logger.warn(
        `Redis live reactions unavailable; using local in-process counters: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private counterKey(liveSessionId: string, reactionType: LiveReactionType) {
    return this.key(['reaction', liveSessionId, reactionType], 'liveCounter');
  }

  private rateLimitKey(liveSessionId: string, userId: string) {
    return this.key(['reaction', liveSessionId, 'user', userId], 'rateLimit');
  }

  private key(parts: Array<string | number>, namespace: 'liveCounter' | 'rateLimit') {
    const config = this.redisRealtimeConfigService.getConfig() as RealtimeRedisConfig;
    return buildRealtimeRedisKey(namespace, parts, config.keyPrefix);
  }

  private purgeExpiredLocal() {
    const now = this.now();
    for (const [key, entry] of this.localCounters.entries()) {
      if (entry.expiresAt <= now) {
        this.localCounters.delete(key);
      }
    }
  }

  private now() {
    return Date.now();
  }
}
