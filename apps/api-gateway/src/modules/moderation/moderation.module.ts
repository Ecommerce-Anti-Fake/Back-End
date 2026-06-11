import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUserModule } from '../user/user.module';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUserModule],
  controllers: [ModerationController],
})
export class GatewayModerationModule {}
