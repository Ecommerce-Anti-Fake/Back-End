import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUsersModule } from '../users/users.module';
import { NotificationController } from './notification.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUsersModule],
  controllers: [NotificationController],
})
export class GatewayNotificationModule {}
