import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUserModule } from '../user/user.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule],
  controllers: [DashboardController],
})
export class GatewayDashboardModule {}
