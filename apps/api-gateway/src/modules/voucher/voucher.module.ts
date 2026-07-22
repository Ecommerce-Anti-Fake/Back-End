import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { VoucherController } from './voucher.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrdersRpcModule],
  controllers: [VoucherController],
})
export class GatewayVoucherModule {}
