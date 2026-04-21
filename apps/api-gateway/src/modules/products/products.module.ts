import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CATALOG_SERVICE_CLIENT } from '@contracts';
import { AuthGuardsModule } from '@security';
import { GatewayUsersModule } from '../users/users.module';
import { ProductsController } from './products.controller';
import { ProductsRpcService } from './products-rpc.service';

@Module({
  imports: [
    ConfigModule,
    AuthGuardsModule,
    GatewayUsersModule,
    ClientsModule.registerAsync([
      {
        name: CATALOG_SERVICE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('CATALOG_SERVICE_HOST')?.trim() ||
              configService.get<string>('USERS_SERVICE_HOST')?.trim() ||
              '127.0.0.1',
            port:
              configService.get<number>('CATALOG_SERVICE_PORT') ??
              configService.get<number>('USERS_SERVICE_PORT') ??
              4002,
          },
        }),
      },
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsRpcService],
  exports: [ProductsRpcService],
})
export class GatewayProductsModule {}
