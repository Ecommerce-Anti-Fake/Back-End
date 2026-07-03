import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayShopModule } from '../shop/shop.module';
import { GatewayUserModule } from '../user/user.module';
import { AdminShopVerificationController } from './admin-shop-verification.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule, GatewayShopModule, GatewayOrdersRpcModule],
  controllers: [AdminController, AdminShopVerificationController],
  providers: [AdminService],
})
export class GatewayAdminModule {}
