import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { SocialController } from './social.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule],
  controllers: [SocialController],
})
export class GatewaySocialModule {}
