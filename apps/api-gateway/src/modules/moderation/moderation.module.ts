import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayUserModule } from '../user/user.module';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrdersRpcModule, GatewayUserModule],
  controllers: [ModerationController],
})
export class GatewayModerationModule {}
