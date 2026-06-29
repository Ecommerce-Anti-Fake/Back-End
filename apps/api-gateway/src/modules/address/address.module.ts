import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUserModule } from '../user/user.module';
import { AddressController } from './address.controller';
import { GatewayOrdersRpcModule } from '../order/orders-rpc.module';
import { AddressCatalogService } from './address-catalog.service';
import { AddressLocationController } from './address-location.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule, GatewayOrdersRpcModule],
  controllers: [AddressController, AddressLocationController],
  providers: [AddressCatalogService],
})
export class GatewayAddressModule {}
