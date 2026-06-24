import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CATALOG_SERVICE_CLIENT } from '@contracts';
import { AuthGuardsModule } from '@security';
import { GatewayUserModule } from '../user/user.module';
import { CatalogRpcService } from './catalog-rpc.service';
import { OfferController } from './offer.controller';

@Module({
  imports: [
    ConfigModule,
    AuthGuardsModule,
    GatewayUserModule,
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
  controllers: [OfferController],
  providers: [CatalogRpcService],
  exports: [CatalogRpcService],
})
export class GatewayOfferModule {}
