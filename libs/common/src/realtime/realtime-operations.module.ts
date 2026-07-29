import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisRealtimeConfigService } from './redis-realtime-config.service';
import { RealtimeEventDispatcher } from './realtime-event.dispatcher';
import { RealtimeLiveReactionService } from './realtime-live-reaction.service';
import { RealtimePresenceService } from './realtime-presence.service';
import { RealtimePublisherLeaseService } from './realtime-publisher-lease.service';

@Module({
  imports: [ConfigModule],
  providers: [
    RedisRealtimeConfigService,
    RealtimeEventDispatcher,
    RealtimeLiveReactionService,
    RealtimePresenceService,
    RealtimePublisherLeaseService,
  ],
  exports: [
    RedisRealtimeConfigService,
    RealtimeEventDispatcher,
    RealtimeLiveReactionService,
    RealtimePresenceService,
    RealtimePublisherLeaseService,
  ],
})
export class RealtimeOperationsModule {}
