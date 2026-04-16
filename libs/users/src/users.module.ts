import { Module } from '@nestjs/common';
import { UserIdentityPort } from '@contracts';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import { UsersIdentityService } from './application/services/users-identity.service';
import {
  DeleteUserUseCase,
  GetAdminKycDetailUseCase,
  GetCurrentUserKycUseCase,
  GetCurrentUserProfileUseCase,
  GetCurrentUserProfileCompletionUseCase,
  GetKycUploadSignaturesUseCase,
  GetUserByIdUseCase,
  ListPendingKycsUseCase,
  ListUsersUseCase,
  ReviewUserKycUseCase,
  SubmitUserKycUseCase,
  UpdateUserUseCase,
} from './application/use-cases';
import { UsersRepository } from './infrastructure/persistence/users.repository';
import { UsersRpcController } from './presentation/rpc/users.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [UsersRpcController],
  providers: [
    UsersIdentityService,
    UsersRepository,
    ListUsersUseCase,
    GetUserByIdUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetAdminKycDetailUseCase,
    GetCurrentUserProfileUseCase,
    GetCurrentUserProfileCompletionUseCase,
    GetCurrentUserKycUseCase,
    GetKycUploadSignaturesUseCase,
    ListPendingKycsUseCase,
    ReviewUserKycUseCase,
    SubmitUserKycUseCase,
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
    GetAdminKycDetailUseCase,
    GetCurrentUserProfileUseCase,
    GetCurrentUserProfileCompletionUseCase,
    GetCurrentUserKycUseCase,
    GetKycUploadSignaturesUseCase,
    ListPendingKycsUseCase,
    ReviewUserKycUseCase,
    SubmitUserKycUseCase,
    UserIdentityPort,
  ],
})
export class UsersModule {}
