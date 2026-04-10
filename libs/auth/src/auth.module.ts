import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@database/prisma/prisma.module';
import { ActiveUserGuard, AuthGuardsModule } from '@security';
import { UsersModule } from '@users';
import { PasswordHasherService } from './application/services';
import { LoginUseCase, LogoutUseCase, RefreshTokenUseCase, RegisterUseCase } from './application/use-cases';
import { JwtTokenAdapter } from './infrastructure/adapters';
import { AuthSessionRepository } from './infrastructure/persistence';
import { AuthController } from './presentation/http/auth.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UsersModule,
    AuthGuardsModule,
  ],
  controllers: [AuthController],
  providers: [
    PasswordHasherService,
    LoginUseCase,
    RegisterUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
    AuthSessionRepository,
    JwtTokenAdapter,
    ActiveUserGuard,
  ],
})
export class AuthModule {}
