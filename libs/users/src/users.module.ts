import { Module } from '@nestjs/common';
import { UserIdentityPort } from '@contracts';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import { UsersIdentityService } from './application/services/users-identity.service';
import {
  DeleteUserUseCase,
  GetAdminKycDetailUseCase,
  GetAdminKycSummaryUseCase,
  GetCurrentUserKycUseCase,
  GetCurrentUserProfileUseCase,
  GetCurrentUserProfileCompletionUseCase,
  GetKycUploadSignaturesUseCase,
  GetUserByIdUseCase,
  CreateUserAddressUseCase,
  DeleteUserAddressUseCase,
  ListUserAddressesUseCase,
  ListPendingKycsUseCase,
  ListUsersUseCase,
  ReviewUserKycUseCase,
  SetDefaultUserAddressUseCase,
  SubmitUserKycUseCase,
  UpdateUserAddressUseCase,
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
    GetAdminKycSummaryUseCase,
    GetCurrentUserProfileUseCase,
    GetCurrentUserProfileCompletionUseCase,
    GetCurrentUserKycUseCase,
    ListUserAddressesUseCase,
    CreateUserAddressUseCase,
    UpdateUserAddressUseCase,
    SetDefaultUserAddressUseCase,
    DeleteUserAddressUseCase,
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
    GetAdminKycSummaryUseCase,
    GetCurrentUserProfileUseCase,
    GetCurrentUserProfileCompletionUseCase,
    GetCurrentUserKycUseCase,
    ListUserAddressesUseCase,
    CreateUserAddressUseCase,
    UpdateUserAddressUseCase,
    SetDefaultUserAddressUseCase,
    DeleteUserAddressUseCase,
    GetKycUploadSignaturesUseCase,
    ListPendingKycsUseCase,
    ReviewUserKycUseCase,
    SubmitUserKycUseCase,
    UserIdentityPort,
  ],
})
export class UsersModule {}
