import { Module } from '@nestjs/common';
import { RealtimeOperationsModule } from '@common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { ChatRealtimeService } from './chat-realtime.service';
import { LiveReactionsRealtimeService } from './live-reactions-realtime.service';

@Module({
  imports: [AuthGuardsModule, RealtimeOperationsModule, GatewayOfferModule],
  providers: [ChatRealtimeService, LiveReactionsRealtimeService],
  exports: [ChatRealtimeService],
})
export class GatewayRealtimeModule {}
