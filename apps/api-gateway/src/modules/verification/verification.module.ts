import { Module } from '@nestjs/common';
import { GatewayOfferModule } from '../offer/offer.module';
import { VerificationController } from './verification.controller';

@Module({
  imports: [GatewayOfferModule],
  controllers: [VerificationController],
})
export class GatewayVerificationModule {}
