import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuardsModule } from '@security';
import { CATALOG_SERVICE_CLIENT } from '@contracts';
import { ShopsController } from './shops.controller';
import { ShopsRpcService } from './shops-rpc.service';
import { GatewayUsersModule } from '../users/users.module';

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
  controllers: [ShopsController],
  providers: [ShopsRpcService],
  exports: [ShopsRpcService],
})
export class GatewayShopsModule {}
