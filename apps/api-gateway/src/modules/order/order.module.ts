import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUserModule } from '../user/user.module';
import { OrderController } from './order.controller';
import { GatewayOrdersRpcModule } from './orders-rpc.module';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule, GatewayOrdersRpcModule],
  controllers: [OrderController],
})
export class GatewayOrderModule {}
