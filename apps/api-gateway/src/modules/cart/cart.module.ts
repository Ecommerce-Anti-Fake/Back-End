import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUserModule } from '../user/user.module';
import { CartController } from './cart.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUserModule],
  controllers: [CartController],
})
export class GatewayCartModule {}
