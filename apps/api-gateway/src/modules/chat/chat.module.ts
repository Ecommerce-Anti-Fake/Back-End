import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [ChatController],
})
export class GatewayChatModule {}
