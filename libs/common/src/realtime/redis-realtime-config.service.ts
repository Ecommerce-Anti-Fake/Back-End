import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveRedisRealtimeConfig } from './redis-realtime.config';

@Injectable()
export class RedisRealtimeConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfig() {
    return resolveRedisRealtimeConfig({
      REDIS_ENABLED: this.configService.get<string>('REDIS_ENABLED'),
      REDIS_URL: this.configService.get<string>('REDIS_URL'),
      REDIS_HOST: this.configService.get<string>('REDIS_HOST'),
      REDIS_PORT: this.configService.get<string>('REDIS_PORT'),
      REDIS_DB: this.configService.get<string>('REDIS_DB'),
      REDIS_KEY_PREFIX: this.configService.get<string>('REDIS_KEY_PREFIX'),
      REDIS_DEFAULT_TTL_SECONDS: this.configService.get<string>('REDIS_DEFAULT_TTL_SECONDS'),
      REDIS_CONNECTION_NAME: this.configService.get<string>('REDIS_CONNECTION_NAME'),
    });
  }
}
