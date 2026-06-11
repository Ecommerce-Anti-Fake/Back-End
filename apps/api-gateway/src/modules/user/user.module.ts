import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserIdentityPort, USERS_SERVICE_CLIENT } from '@contracts';
import { AuthGuardsModule } from '@security';
import { DashboardSseBrokerService } from './dashboard-sse-broker.service';
import { NotificationSseBrokerService } from './notification-sse-broker.service';
import { UserController } from './user.controller';
import { UsersIdentityAdapter } from './users-identity.adapter';
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
  controllers: [UserController],
  providers: [
    UsersRpcService,
    UsersIdentityAdapter,
    DashboardSseBrokerService,
    NotificationSseBrokerService,
    {
      provide: UserIdentityPort,
      useExisting: UsersIdentityAdapter,
    },
  ],
  exports: [UsersRpcService, UserIdentityPort, DashboardSseBrokerService, NotificationSseBrokerService],
})
export class GatewayUserModule {}
