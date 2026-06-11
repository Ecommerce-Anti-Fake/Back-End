import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayProductsModule } from '../products/products.module';
import { CategoryController } from './category.controller';

@Module({
  imports: [AuthGuardsModule, GatewayProductsModule],
  controllers: [CategoryController],
})
export class GatewayCategoryModule {}
