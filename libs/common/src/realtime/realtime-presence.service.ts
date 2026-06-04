import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';
import {
  REALTIME_REDIS_KEY_TTLS_SECONDS,
  buildRealtimeRedisKey,
  type RealtimeRedisConfig,
} from './redis-realtime.config';

export const PRESENCE_HEARTBEAT_INTERVAL_MS = 15_000;
export const PRESENCE_SESSION_TTL_SECONDS = REALTIME_REDIS_KEY_TTLS_SECONDS.presence;
export const TYPING_TTL_SECONDS = REALTIME_REDIS_KEY_TTLS_SECONDS.typing;

type LocalEntry = {
  value: string;
  expiresAt: number;
};

type HeartbeatInput = {
  userId: string;
  sessionId: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

@Injectable()
export class RealtimePresenceService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimePresenceService.name);
  private redis: RedisClientType | null = null;
  private redisReady = false;
  private redisInitPromise: Promise<void> | null = null;
  private readonly localStore = new Map<string, LocalEntry>();

  constructor(private readonly redisRealtimeConfigService: RedisRealtimeConfigService) {}

  async heartbeat(input: HeartbeatInput) {
    const key = this.sessionKey(input.userId, input.sessionId);
    const value = JSON.stringify({
      userId: input.userId,
      sessionId: input.sessionId,
      metadata: input.metadata ?? {},
      heartbeatAt: new Date(this.now()).toISOString(),
    });
    await this.setExpiring(key, value, PRESENCE_SESSION_TTL_SECONDS);
  }

  async markTyping(input: { scope: string; userId: string; isTyping: boolean }) {
    const key = this.typingKey(input.scope, input.userId);
    if (!input.isTyping) {
      await this.deleteKey(key);
      return;
    }

    await this.setExpiring(key, JSON.stringify({ userId: input.userId, scope: input.scope }), TYPING_TTL_SECONDS);
  }

  async addLiveViewer(input: { liveSessionId: string; userId: string; sessionId: string }) {
    await this.setExpiring(
      this.liveViewerKey(input.liveSessionId, input.userId, input.sessionId),
      JSON.stringify(input),
      REALTIME_REDIS_KEY_TTLS_SECONDS.liveCounter,
    );
  }

  async refreshLiveViewer(input: { liveSessionId: string; userId: string; sessionId: string }) {
    await this.addLiveViewer(input);
  }

  async countLiveViewers(liveSessionId: string) {
    const keys = await this.keys(this.liveViewerPattern(liveSessionId));
    const userIds = new Set<string>();
    for (const key of keys) {
      const value = await this.getKey(key);
      if (!value) continue;
      try {
        const parsed = JSON.parse(value) as { userId?: string };
        if (parsed.userId) {
          userIds.add(parsed.userId);
        }
      } catch {
        // Ignore malformed ephemeral presence payloads.
      }
    }
    return userIds.size;
  }

  async isUserOnline(userId: string) {
    return (await this.keys(this.sessionPattern(userId))).length > 0;
  }

  async listOnlineUserIds(userIds: string[]) {
    const online: string[] = [];
    for (const userId of Array.from(new Set(userIds))) {
      if (await this.isUserOnline(userId)) {
        online.push(userId);
      }
    }
    return online;
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => undefined);
    this.redis = null;
    this.redisReady = false;
    this.redisInitPromise = null;
  }

  private async setExpiring(key: string, value: string, ttlSeconds: number) {
    const redis = await this.getRedis();
    if (redis) {
      await redis.set(key, value, { EX: ttlSeconds });
      return;
    }

    this.localStore.set(key, {
      value,
      expiresAt: this.now() + ttlSeconds * 1000,
    });
  }

  private async deleteKey(key: string) {
    const redis = await this.getRedis();
    if (redis) {
      await redis.del(key);
      return;
    }

    this.localStore.delete(key);
  }

  private async getKey(key: string) {
    const redis = await this.getRedis();
    if (redis) {
      return redis.get(key);
    }

    this.purgeExpiredLocal();
    return this.localStore.get(key)?.value ?? null;
  }

  private async keys(pattern: string) {
    const redis = await this.getRedis();
    if (redis) {
      const keys: string[] = [];
      for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        keys.push(String(key));
      }
      return keys;
    }

    this.purgeExpiredLocal();
    const matcher = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
    return Array.from(this.localStore.keys()).filter((key) => matcher.test(key));
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
      name: `${config.connectionName}:presence`,
    }) as RedisClientType;

    try {
      await redis.connect();
      this.redis = redis;
      this.redisReady = true;
    } catch (error) {
      await redis.quit().catch(() => undefined);
      this.logger.warn(
        `Redis presence unavailable; using local in-process presence fallback: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private sessionKey(userId: string, sessionId: string) {
    return this.key(['user', userId, 'session', sessionId], 'presence');
  }

  private sessionPattern(userId: string) {
    return `${this.key(['user', userId, 'session'], 'presence')}:*`;
  }

  private typingKey(scope: string, userId: string) {
    return this.key(['typing', scope, userId], 'presence');
  }

  private liveViewerKey(liveSessionId: string, userId: string, sessionId: string) {
    return this.key(['live', liveSessionId, 'viewer', userId, sessionId], 'liveCounter');
  }

  private liveViewerPattern(liveSessionId: string) {
    return `${this.key(['live', liveSessionId, 'viewer'], 'liveCounter')}:*`;
  }

  private key(parts: Array<string | number>, namespace: 'presence' | 'liveCounter') {
    const config = this.redisRealtimeConfigService.getConfig() as RealtimeRedisConfig;
    return buildRealtimeRedisKey(namespace, parts, config.keyPrefix);
  }

  private purgeExpiredLocal() {
    const now = this.now();
    for (const [key, entry] of this.localStore.entries()) {
      if (entry.expiresAt <= now) {
        this.localStore.delete(key);
      }
    }
  }

  private now() {
    return Date.now();
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
