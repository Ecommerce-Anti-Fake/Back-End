import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { CategoryController } from './category.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule],
  controllers: [CategoryController],
})
export class GatewayCategoryModule {}
