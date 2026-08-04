import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayUserModule } from '../user/user.module';
import { GatewayWalletModule } from '../wallet/wallet.module';
import { PaymentController } from './payment.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrdersRpcModule, GatewayWalletModule, GatewayUserModule],
  controllers: [PaymentController],
})
export class GatewayPaymentModule {}
