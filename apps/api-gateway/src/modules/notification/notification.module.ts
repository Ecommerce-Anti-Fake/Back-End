import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUserModule } from '../user/user.module';
import { NotificationController } from './notification.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule],
  controllers: [NotificationController],
})
export class GatewayNotificationModule {}
