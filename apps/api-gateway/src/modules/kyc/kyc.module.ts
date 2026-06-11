import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayUserModule } from '../user/user.module';
import { KycController } from './kyc.controller';

@Module({
  imports: [AuthGuardsModule, GatewayUserModule],
  controllers: [KycController],
})
export class GatewayKycModule {}
