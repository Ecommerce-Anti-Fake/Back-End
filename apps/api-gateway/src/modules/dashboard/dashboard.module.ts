import { Module } from '@nestjs/common';
import { GatewayUserModule } from '../user/user.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [GatewayUserModule],
  controllers: [DashboardController],
})
export class GatewayDashboardModule {}
