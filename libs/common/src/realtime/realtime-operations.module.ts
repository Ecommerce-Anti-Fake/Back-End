import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';
import { RealtimeEventDispatcher } from './realtime-event.dispatcher';
import { RealtimeLiveReactionService } from './realtime-live-reaction.service';
import { RealtimePresenceService } from './realtime-presence.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisRealtimeConfigService, RealtimeEventDispatcher, RealtimeLiveReactionService, RealtimePresenceService],
  exports: [RedisRealtimeConfigService, RealtimeEventDispatcher, RealtimeLiveReactionService, RealtimePresenceService],
})
export class RealtimeOperationsModule {}
