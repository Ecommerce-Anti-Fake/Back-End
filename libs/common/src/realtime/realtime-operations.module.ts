import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';
import { RealtimeEventDispatcher } from './realtime-event.dispatcher';

@Module({
  imports: [ConfigModule],
  providers: [RedisRealtimeConfigService, RealtimeEventDispatcher],
  exports: [RedisRealtimeConfigService, RealtimeEventDispatcher],
})
export class RealtimeOperationsModule {}
