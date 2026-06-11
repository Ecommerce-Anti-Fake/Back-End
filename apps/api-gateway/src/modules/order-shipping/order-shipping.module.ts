import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUserModule } from '../user/user.module';
import { OrderShippingController } from './order-shipping.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUserModule],
  controllers: [OrderShippingController],
})
export class GatewayOrderShippingModule {}
