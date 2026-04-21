import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { UserIdentityPort, USERS_SERVICE_CLIENT } from '@contracts';
import { PrismaModule } from '@database/prisma/prisma.module';
import { PasswordHasherService } from './application/services';
import { LoginUseCase, LogoutUseCase, RefreshTokenUseCase, RegisterUseCase } from './application/use-cases';
import { JwtTokenAdapter, UsersIdentityAdapter } from './infrastructure/adapters';
import { AuthSessionRepository } from './infrastructure/persistence';
import { AuthRpcController } from './presentation/rpc/auth.rpc-controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET')?.trim();
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }

        return {
          secret,
          signOptions: {
            expiresIn:
              (configService.get<string>('ACCESS_TOKEN_TTL')?.trim() as StringValue) || '15m',
          },
        };
      },
    }),
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
  controllers: [AuthRpcController],
  providers: [
    PasswordHasherService,
    LoginUseCase,
    RegisterUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    AuthSessionRepository,
    JwtTokenAdapter,
    UsersIdentityAdapter,
    {
      provide: UserIdentityPort,
      useExisting: UsersIdentityAdapter,
    },
  ],
})
export class AuthModule {}
