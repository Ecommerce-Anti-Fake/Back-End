import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayProductsModule } from '../products/products.module';
import { ReviewController } from './review.controller';

@Module({
  imports: [AuthGuardsModule, GatewayProductsModule],
  controllers: [ReviewController],
})
export class GatewayReviewModule {}
