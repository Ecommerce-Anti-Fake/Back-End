import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUsersModule } from '../users/users.module';
import { OrderShippingController } from './order-shipping.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUsersModule],
  controllers: [OrderShippingController],
})
export class GatewayOrderShippingModule {}
