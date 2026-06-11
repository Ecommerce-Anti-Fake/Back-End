import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayUserModule } from '../user/user.module';
import { PaymentController } from './payment.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayUserModule],
  controllers: [PaymentController],
})
export class GatewayPaymentModule {}
