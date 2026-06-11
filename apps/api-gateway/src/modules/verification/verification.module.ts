import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayShopsModule } from '../shops/shops.module';
import { VerificationController } from './verification.controller';

@Module({
  imports: [AuthGuardsModule, GatewayShopsModule],
  controllers: [VerificationController],
})
export class GatewayVerificationModule {}
