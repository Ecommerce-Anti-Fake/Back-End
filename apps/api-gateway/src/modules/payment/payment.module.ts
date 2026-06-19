import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayUserModule } from '../user/user.module';
import { PaymentController } from './payment.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrdersRpcModule, GatewayUserModule],
  controllers: [PaymentController],
})
export class GatewayPaymentModule {}
