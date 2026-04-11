import { Module } from '@nestjs/common';
import { UserIdentityPort } from '@contracts';
import { PrismaModule } from '@database/prisma/prisma.module';
import { UsersIdentityService } from './application/services/users-identity.service';
import {
  DeleteUserUseCase,
  GetCurrentUserProfileUseCase,
  GetUserByIdUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from './application/use-cases';
import { UsersRepository } from './infrastructure/persistence/users.repository';
import { UsersRpcController } from './presentation/rpc/users.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [UsersRpcController],
  providers: [
    UsersIdentityService,
    UsersRepository,
    ListUsersUseCase,
    GetUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetCurrentUserProfileUseCase,
    {
      provide: UserIdentityPort,
      useExisting: UsersIdentityService,
    },
  ],
  exports: [
    UsersIdentityService,
    ListUsersUseCase,
    GetUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetCurrentUserProfileUseCase,
    UserIdentityPort,
  ],
})
export class UsersModule {}
