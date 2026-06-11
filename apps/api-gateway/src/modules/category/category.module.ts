import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayUserModule } from '../user/user.module';
import { CategoryController } from './category.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayUserModule],
  controllers: [CategoryController],
})
export class GatewayCategoryModule {}
