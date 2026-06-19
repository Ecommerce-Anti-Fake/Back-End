import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayUserModule } from '../user/user.module';
import { CartController } from './cart.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrdersRpcModule, GatewayUserModule],
  controllers: [CartController],
})
export class GatewayCartModule {}
