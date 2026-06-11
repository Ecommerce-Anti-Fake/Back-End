import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUserModule } from '../user/user.module';
import { ReportController } from './report.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUserModule],
  controllers: [ReportController],
})
export class GatewayReportModule {}
