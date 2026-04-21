import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AFFILIATE_SERVICE_CLIENT } from '@contracts';
import { AuthGuardsModule } from '@security';
import { GatewayUsersModule } from '../users/users.module';
import { AffiliateController } from './affiliate.controller';
import { AffiliateRpcService } from './affiliate-rpc.service';

@Module({
  imports: [
    ConfigModule,
    AuthGuardsModule,
    GatewayUsersModule,
    ClientsModule.registerAsync([
      {
        name: AFFILIATE_SERVICE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host:
              configService.get<string>('AFFILIATE_SERVICE_HOST')?.trim() ||
              configService.get<string>('USERS_SERVICE_HOST')?.trim() ||
              '127.0.0.1',
            port:
              configService.get<number>('AFFILIATE_SERVICE_PORT') ??
              configService.get<number>('USERS_SERVICE_PORT') ??
              4002,
          },
        }),
      },
    ]),
  ],
  controllers: [AffiliateController],
  providers: [AffiliateRpcService],
  exports: [AffiliateRpcService],
})
export class GatewayAffiliateModule {}
