import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeOperationsModule } from '@common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { LiveController } from './live.controller';
import { CloudflareStreamService } from './cloudflare-stream.service';
import { CloudflareStreamWebhookController } from './cloudflare-stream-webhook.controller';

@Module({
  imports: [ConfigModule, AuthGuardsModule, RealtimeOperationsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [LiveController, CloudflareStreamWebhookController],
  providers: [CloudflareStreamService],
})
export class GatewayLiveModule {}
