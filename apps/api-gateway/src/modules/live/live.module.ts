import { Module } from '@nestjs/common';
import { RealtimeOperationsModule } from '@common';
import { AuthGuardsModule } from '@security';
import { GatewayProductsModule } from '../products/products.module';
import { GatewayUsersModule } from '../users/users.module';
import { LiveController } from './live.controller';

@Module({
  imports: [AuthGuardsModule, RealtimeOperationsModule, GatewayProductsModule, GatewayUsersModule],
  controllers: [LiveController],
})
export class GatewayLiveModule {}
