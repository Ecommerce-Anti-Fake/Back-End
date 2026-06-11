import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayShopsModule } from '../shops/shops.module';
import { GatewayUsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthGuardsModule, GatewayUsersModule, GatewayShopsModule, GatewayOrderModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class GatewayAdminModule {}
