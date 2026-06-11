import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUsersModule } from '../users/users.module';
import { ReportController } from './report.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUsersModule],
  controllers: [ReportController],
})
export class GatewayReportModule {}
