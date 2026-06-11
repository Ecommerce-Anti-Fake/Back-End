import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUserModule } from '../user/user.module';
import { AddressController } from './address.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule],
  controllers: [AddressController],
})
export class GatewayAddressModule {}
