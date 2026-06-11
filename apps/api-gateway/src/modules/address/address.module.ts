import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUsersModule } from '../users/users.module';
import { AddressController } from './address.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUsersModule],
  controllers: [AddressController],
})
export class GatewayAddressModule {}
