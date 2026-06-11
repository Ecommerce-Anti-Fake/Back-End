import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { ReviewController } from './review.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule],
  controllers: [ReviewController],
})
export class GatewayReviewModule {}
