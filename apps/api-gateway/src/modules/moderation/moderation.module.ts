import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUsersModule } from '../users/users.module';
import { ModerationController } from './moderation.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUsersModule],
  controllers: [ModerationController],
})
export class GatewayModerationModule {}
