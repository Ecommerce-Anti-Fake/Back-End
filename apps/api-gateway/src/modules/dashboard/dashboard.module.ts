import { Module } from '@nestjs/common';
import { GatewayUsersModule } from '../users/users.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [GatewayUsersModule],
  controllers: [DashboardController],
})
export class GatewayDashboardModule {}
