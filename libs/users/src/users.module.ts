import { Module } from '@nestjs/common';
import { UserIdentityPort } from '@contracts';
import { PrismaModule } from '@database/prisma/prisma.module';
import { ActiveUserGuard, AuthGuardsModule } from '@security';
import { GetCurrentUserProfileUseCase } from './application/use-cases/get-current-user-profile.use-case';
import { UsersIdentityService } from './application/services/users-identity.service';
import { UsersService } from './application/services/users.service';
import { UsersRepository } from './infrastructure/persistence/users.repository';
import { UsersController } from './presentation/http/users.controller';

@Module({
  imports: [PrismaModule, AuthGuardsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersIdentityService,
    UsersRepository,
    GetCurrentUserProfileUseCase,
    ActiveUserGuard,
    {
      provide: UserIdentityPort,
      useExisting: UsersIdentityService,
    },
  ],
  exports: [UsersService, UsersIdentityService, GetCurrentUserProfileUseCase, UserIdentityPort],
})
export class UsersModule {}
