import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisRealtimeConfigService],
  exports: [RedisRealtimeConfigService],
})
export class RealtimeOperationsModule {}
