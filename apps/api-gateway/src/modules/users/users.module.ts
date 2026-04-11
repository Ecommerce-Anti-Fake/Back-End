import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserIdentityPort, USERS_SERVICE_CLIENT } from '@contracts';
import { AuthGuardsModule } from '@security';
import { UsersController } from './users.controller';
import { UsersIdentityRpcAdapter } from './users-identity.rpc-adapter';
import { UsersRpcService } from './users-rpc.service';

@Module({
  imports: [
    ConfigModule,
    AuthGuardsModule,
    ClientsModule.registerAsync([
      {
        name: USERS_SERVICE_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('USERS_SERVICE_HOST')?.trim() || '127.0.0.1',
            port: configService.get<number>('USERS_SERVICE_PORT') ?? 4002,
          },
        }),
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersRpcService,
    UsersIdentityRpcAdapter,
    {
      provide: UserIdentityPort,
      useExisting: UsersIdentityRpcAdapter,
    },
  ],
  exports: [UsersRpcService, UserIdentityPort],
})
export class GatewayUsersModule {}
