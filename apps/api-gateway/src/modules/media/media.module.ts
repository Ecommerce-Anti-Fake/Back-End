import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayProductsModule } from '../products/products.module';
import { GatewayShopsModule } from '../shops/shops.module';
import { MediaController } from './media.controller';
import { OrderEvidenceController } from './order-evidence.controller';
import { ShopDocumentController } from './shop-document.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOrderModule, GatewayProductsModule, GatewayShopsModule],
  controllers: [MediaController, OrderEvidenceController, ShopDocumentController],
})
export class GatewayMediaModule {}
