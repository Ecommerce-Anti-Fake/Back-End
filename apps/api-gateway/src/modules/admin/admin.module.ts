import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayShopModule } from '../shop/shop.module';
import { GatewayUserModule } from '../user/user.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule, GatewayShopModule, GatewayOrdersRpcModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class GatewayAdminModule {}
