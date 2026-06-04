import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';
import { RealtimeEventDispatcher } from './realtime-event.dispatcher';
import { RealtimePresenceService } from './realtime-presence.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisRealtimeConfigService, RealtimeEventDispatcher, RealtimePresenceService],
  exports: [RedisRealtimeConfigService, RealtimeEventDispatcher, RealtimePresenceService],
})
export class RealtimeOperationsModule {}
