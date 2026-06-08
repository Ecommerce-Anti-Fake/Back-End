import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_METADATA_KEY, RateLimitOptions, RateLimitProfile } from './rate-limit.decorator';

interface RateBucket {
  count: number;
  resetAt: number;
}

const defaultProfiles: Record<RateLimitProfile, { limit: number; windowMs: number }> = {
  auth: { limit: 10, windowMs: 60_000 },
  uploadSignature: { limit: 20, windowMs: 60_000 },
  paymentWebhook: { limit: 60, windowMs: 60_000 },
  publicCatalog: { limit: 120, windowMs: 60_000 },
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly buckets = new Map<string, RateBucket>();

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const profile = this.resolveProfile(options);
    const now = Date.now();
    const key = `${options.profile}:${this.clientKey(request)}`;
    const existing = this.buckets.get(key);
    const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + profile.windowMs };

    bucket.count += 1;
    this.buckets.set(key, bucket);
    this.evictExpired(now);

    if (bucket.count <= profile.limit) {
      return true;
    }

    this.logger.warn(
      JSON.stringify({
        event: 'rate_limit.exceeded',
        profile: options.profile,
        method: request.method,
        path: request.originalUrl ?? request.url,
        client: this.clientKey(request),
        limit: profile.limit,
        windowMs: profile.windowMs,
        resetAt: new Date(bucket.resetAt).toISOString(),
      }),
    );

    throw new HttpException(
      {
        message: 'Too many requests',
        rateLimit: {
          profile: options.profile,
          limit: profile.limit,
          windowMs: profile.windowMs,
          retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private resolveProfile(options: RateLimitOptions) {
    const defaults = defaultProfiles[options.profile];
    const envPrefix = `RATE_LIMIT_${this.envProfileName(options.profile)}`;
    const envLimit = this.configService.get<string>(`${envPrefix}_LIMIT`);
    const envWindowMs = this.configService.get<string>(`${envPrefix}_WINDOW_MS`);

    return {
      limit: options.limit ?? this.positiveNumber(envLimit) ?? defaults.limit,
      windowMs: options.windowMs ?? this.positiveNumber(envWindowMs) ?? defaults.windowMs,
    };
  }

  private clientKey(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const firstForwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
    const userId = (request as Request & { user?: { id?: string } }).user?.id;

    return userId ?? firstForwardedIp?.trim() ?? request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }

  private evictExpired(now: number) {
    if (this.buckets.size < 1_000) {
      return;
    }

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private envProfileName(profile: RateLimitProfile) {
    return profile.replace(/[A-Z]/g, (match) => `_${match}`).toUpperCase();
  }

  private positiveNumber(value: string | undefined) {
    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
