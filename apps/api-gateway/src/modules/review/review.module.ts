import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { ReviewController } from './review.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [ReviewController],
})
export class GatewayReviewModule {}
