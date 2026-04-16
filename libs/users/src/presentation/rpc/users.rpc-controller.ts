import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USERS_MESSAGE_PATTERNS } from '@contracts';
import { throwRpcException } from '@common';
import type {
  AdminKycDetailMessage,
  CreateUserIdentityMessage,
  CurrentUserProfileMessage,
  CurrentUserProfileCompletionMessage,
  CurrentUserKycMessage,
  KycUploadSignaturesMessage,
  ListUsersMessage,
  PendingKycsLookupMessage,
  ReviewKycMessage,
  SubmitKycMessage,
  UpdateUserMessage,
  UserIdentityLookupMessage,
  UserLookupMessage,
} from '@contracts';
import { UsersIdentityService } from '../../application/services/users-identity.service';
import {
  DeleteUserUseCase,
  GetAdminKycDetailUseCase,
  GetCurrentUserKycUseCase,
  GetCurrentUserProfileCompletionUseCase,
  GetCurrentUserProfileUseCase,
  GetKycUploadSignaturesUseCase,
  GetUserByIdUseCase,
  ListPendingKycsUseCase,
  ListUsersUseCase,
  ReviewUserKycUseCase,
  SubmitUserKycUseCase,
  UpdateUserUseCase,
} from '../../application/use-cases';

@Controller()
export class UsersRpcController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly usersIdentityService: UsersIdentityService,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly getAdminKycDetailUseCase: GetAdminKycDetailUseCase,
    private readonly getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase,
    private readonly getCurrentUserProfileCompletionUseCase: GetCurrentUserProfileCompletionUseCase,
    private readonly getCurrentUserKycUseCase: GetCurrentUserKycUseCase,
    private readonly listPendingKycsUseCase: ListPendingKycsUseCase,
    private readonly getKycUploadSignaturesUseCase: GetKycUploadSignaturesUseCase,
    private readonly submitUserKycUseCase: SubmitUserKycUseCase,
    private readonly reviewUserKycUseCase: ReviewUserKycUseCase,
  ) {}

  @MessagePattern(USERS_MESSAGE_PATTERNS.findAll)
  async findAll(@Payload() payload?: ListUsersMessage) {
    try {
      return await this.listUsersUseCase.execute(payload?.role);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getCurrentProfile)
  async getCurrentProfile(@Payload() payload: CurrentUserProfileMessage) {
    try {
      return await this.getCurrentUserProfileUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getProfileCompletion)
  async getProfileCompletion(@Payload() payload: CurrentUserProfileCompletionMessage) {
    try {
      return await this.getCurrentUserProfileCompletionUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getMyKyc)
  async getMyKyc(@Payload() payload: CurrentUserKycMessage) {
    try {
      return await this.getCurrentUserKycUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.findPendingKycs)
  async findPendingKycs(@Payload() payload?: PendingKycsLookupMessage) {
    try {
      return await this.listPendingKycsUseCase.execute(payload?.verificationStatus);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getAdminKycDetail)
  async getAdminKycDetail(@Payload() payload: AdminKycDetailMessage) {
    try {
      return await this.getAdminKycDetailUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getKycUploadSignatures)
  async getKycUploadSignatures(@Payload() payload: KycUploadSignaturesMessage) {
    try {
      return await this.getKycUploadSignaturesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.submitKyc)
  async submitKyc(@Payload() payload: SubmitKycMessage) {
    try {
      return await this.submitUserKycUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.reviewKyc)
  async reviewKyc(@Payload() payload: ReviewKycMessage) {
    try {
      return await this.reviewUserKycUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.findById)
  async findById(@Payload() payload: UserIdentityLookupMessage) {
    try {
      return await this.usersIdentityService.findById(payload.id ?? '');
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.findByIdentifier)
  async findByIdentifier(@Payload() payload: UserIdentityLookupMessage) {
    try {
      return await this.usersIdentityService.findByIdentifier({
        email: payload.email,
        phone: payload.phone,
      });
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.create)
  async create(@Payload() payload: CreateUserIdentityMessage) {
    try {
      return await this.usersIdentityService.create(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getUserById)
  async getUserById(@Payload() payload: UserLookupMessage) {
    try {
      return await this.getUserByIdUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.updateUser)
  async updateUser(@Payload() payload: UpdateUserMessage) {
    try {
      return await this.updateUserUseCase.execute(payload.id, payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.deleteUser)
  async deleteUser(@Payload() payload: UserLookupMessage) {
    try {
      return await this.deleteUserUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
