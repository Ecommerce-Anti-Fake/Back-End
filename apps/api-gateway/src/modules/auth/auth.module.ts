import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuardsModule } from '@security';
import { AUTH_SERVICE_CLIENT } from '@contracts';
import { GatewayUserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthRpcService } from './auth-rpc.service';

@Module({
  imports: [
    ConfigModule,
    AuthGuardsModule,
    GatewayUserModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('AUTH_SERVICE_HOST')?.trim() || '127.0.0.1',
            port: configService.get<number>('AUTH_SERVICE_PORT') ?? 4001,
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthRpcService],
})
export class GatewayAuthModule {}
