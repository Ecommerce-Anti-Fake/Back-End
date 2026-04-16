import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersModule } from '../orders/orders.module';
import { GatewayShopsModule } from '../shops/shops.module';
import { GatewayUsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthGuardsModule, GatewayUsersModule, GatewayShopsModule, GatewayOrdersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class GatewayAdminModule {}
