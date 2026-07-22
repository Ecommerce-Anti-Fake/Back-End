import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { GatewayUserModule } from '../user/user.module';
import { VoucherController } from './voucher.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrdersRpcModule, GatewayUserModule],
  controllers: [VoucherController],
})
export class GatewayVoucherModule {}
