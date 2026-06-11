import { Module } from '@nestjs/common';
import { AuthGuardsModule } from '@security';
import { GatewayOfferModule } from '../offer/offer.module';
import { GatewayOrderModule } from '../order/order.module';
import { GatewayShopModule } from '../shop/shop.module';
import { GatewayUserModule } from '../user/user.module';
import { MediaController } from './media.controller';
import { OrderEvidenceController } from './order-evidence.controller';
import { ShopDocumentController } from './shop-document.controller';

@Module({
  imports: [AuthGuardsModule, GatewayOfferModule, GatewayOrderModule, GatewayShopModule, GatewayUserModule],
  controllers: [MediaController, OrderEvidenceController, ShopDocumentController],
})
export class GatewayMediaModule {}
