import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayProductsModule } from '../products/products.module';
import { ChatController } from './chat.controller';

@Module({
  imports: [AuthGuardsModule, GatewayProductsModule],
  controllers: [ChatController],
})
export class GatewayChatModule {}
