import { Module } from '@nestjs/common';
import { RealtimeOperationsModule } from '@common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { LiveController } from './live.controller';

@Module({
  imports: [AuthGuardsModule, RealtimeOperationsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [LiveController],
})
export class GatewayLiveModule {}
