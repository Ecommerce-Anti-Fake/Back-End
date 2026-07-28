import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeOperationsModule } from '@common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { LiveController } from './live.controller';
import { AgoraRtcTokenService } from './agora-rtc-token.service';

@Module({
  imports: [ConfigModule, AuthGuardsModule, RealtimeOperationsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [LiveController],
  providers: [AgoraRtcTokenService],
})
export class GatewayLiveModule {}
