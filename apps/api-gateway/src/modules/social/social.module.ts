import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { SocialController } from './social.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [SocialController],
})
export class GatewaySocialModule {}
