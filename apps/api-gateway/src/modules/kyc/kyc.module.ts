import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUsersModule } from '../users/users.module';
import { KycController } from './kyc.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUsersModule],
  controllers: [KycController],
})
export class GatewayKycModule {}
