import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUsersModule } from '../users/users.module';
import { CartController } from './cart.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUsersModule],
  controllers: [CartController],
})
export class GatewayCartModule {}
