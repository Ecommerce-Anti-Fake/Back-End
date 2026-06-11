import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule],
  controllers: [ChatController],
})
export class GatewayChatModule {}
