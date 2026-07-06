import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USERS_MESSAGE_PATTERNS } from '@contracts';
import { throwRpcException } from '@common';
import type {
  AdminKycDetailMessage,
  AdminKycSummaryMessage,
  CreateNotificationMessage,
  CreateUserIdentityMessage,
  UpdateUserPasswordMessage,
  CreateUserAddressMessage,
  CurrentUserProfileMessage,
  CurrentUserProfileCompletionMessage,
  CurrentUserKycMessage,
  KycUploadSignaturesMessage,
  ListNotificationsMessage,
  ListUsersMessage,
  NotificationLookupMessage,
  PendingKycsLookupMessage,
  RegisterNotificationFcmTokenMessage,
  ReviewKycMessage,
  RevokeNotificationFcmTokenMessage,
  SubmitKycMessage,
  UploadCurrentUserAvatarMessage,
  UpdateCurrentUserProfileMessage,
  UpdateUserMessage,
  UpdateUserAddressMessage,
  UserAddressLookupMessage,
  UserIdentityLookupMessage,
  UserLookupMessage,
} from '@contracts';
import { UsersIdentityService } from '../../application/services/users-identity.service';
import {
  CreateNotificationUseCase,
  DeleteUserUseCase,
  GetAdminKycDetailUseCase,
  GetAdminKycSummaryUseCase,
  GetDefaultUserAddressUseCase,
  GetCurrentUserKycUseCase,
  GetCurrentUserProfileCompletionUseCase,
  GetCurrentUserProfileUseCase,
  GetKycUploadSignaturesUseCase,
  GetUserByIdUseCase,
  CreateUserAddressUseCase,
  DeleteUserAddressUseCase,
  ListUserAddressesUseCase,
  ListNotificationsUseCase,
  ListPendingKycsUseCase,
  ListUsersUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
  RegisterNotificationFcmTokenUseCase,
  RevokeNotificationFcmTokenUseCase,
  ReviewUserKycUseCase,
  SetDefaultUserAddressUseCase,
  SubmitUserKycUseCase,
  UploadCurrentUserAvatarUseCase,
  UpdateCurrentUserProfileUseCase,
  UpdateUserAddressUseCase,
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
    private readonly getAdminKycSummaryUseCase: GetAdminKycSummaryUseCase,
    private readonly getCurrentUserProfileUseCase: GetCurrentUserProfileUseCase,
    private readonly updateCurrentUserProfileUseCase: UpdateCurrentUserProfileUseCase,
    private readonly uploadCurrentUserAvatarUseCase: UploadCurrentUserAvatarUseCase,
    private readonly getCurrentUserProfileCompletionUseCase: GetCurrentUserProfileCompletionUseCase,
    private readonly listUserAddressesUseCase: ListUserAddressesUseCase,
    private readonly getDefaultUserAddressUseCase: GetDefaultUserAddressUseCase,
    private readonly createUserAddressUseCase: CreateUserAddressUseCase,
    private readonly updateUserAddressUseCase: UpdateUserAddressUseCase,
    private readonly setDefaultUserAddressUseCase: SetDefaultUserAddressUseCase,
    private readonly deleteUserAddressUseCase: DeleteUserAddressUseCase,
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly registerNotificationFcmTokenUseCase: RegisterNotificationFcmTokenUseCase,
    private readonly revokeNotificationFcmTokenUseCase: RevokeNotificationFcmTokenUseCase,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly getCurrentUserKycUseCase: GetCurrentUserKycUseCase,
    private readonly listPendingKycsUseCase: ListPendingKycsUseCase,
    private readonly getKycUploadSignaturesUseCase: GetKycUploadSignaturesUseCase,
    private readonly submitUserKycUseCase: SubmitUserKycUseCase,
    private readonly reviewUserKycUseCase: ReviewUserKycUseCase,
  ) {}

  @MessagePattern(USERS_MESSAGE_PATTERNS.findAll)
  async findAll(@Payload() payload?: ListUsersMessage) {
    try {
      return await this.listUsersUseCase.execute(payload);
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

  @MessagePattern(USERS_MESSAGE_PATTERNS.updateCurrentProfile)
  async updateCurrentProfile(@Payload() payload: UpdateCurrentUserProfileMessage) {
    try {
      return await this.updateCurrentUserProfileUseCase.execute(payload.userId, payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.uploadCurrentAvatar)
  async uploadCurrentAvatar(@Payload() payload: UploadCurrentUserAvatarMessage) {
    try {
      return await this.uploadCurrentUserAvatarUseCase.execute(payload);
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

  @MessagePattern(USERS_MESSAGE_PATTERNS.listAddresses)
  async listAddresses(@Payload() payload: CurrentUserProfileMessage) {
    try {
      return await this.listUserAddressesUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getDefaultAddress)
  async getDefaultAddress(@Payload() payload: CurrentUserProfileMessage) {
    try {
      return await this.getDefaultUserAddressUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.createAddress)
  async createAddress(@Payload() payload: CreateUserAddressMessage) {
    try {
      return await this.createUserAddressUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.updateAddress)
  async updateAddress(@Payload() payload: UpdateUserAddressMessage) {
    try {
      return await this.updateUserAddressUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.setDefaultAddress)
  async setDefaultAddress(@Payload() payload: UserAddressLookupMessage) {
    try {
      return await this.setDefaultUserAddressUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.deleteAddress)
  async deleteAddress(@Payload() payload: UserAddressLookupMessage) {
    try {
      return await this.deleteUserAddressUseCase.execute(payload);
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
      return await this.listPendingKycsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.getAdminKycSummary)
  async getAdminKycSummary(@Payload() _payload?: AdminKycSummaryMessage) {
    try {
      return await this.getAdminKycSummaryUseCase.execute();
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

  @MessagePattern(USERS_MESSAGE_PATTERNS.updatePassword)
  async updatePassword(@Payload() payload: UpdateUserPasswordMessage) {
    try {
      return await this.usersIdentityService.updatePassword(payload.userId, payload.password);
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

  @MessagePattern(USERS_MESSAGE_PATTERNS.listNotifications)
  async listNotifications(@Payload() payload: ListNotificationsMessage) {
    try {
      return await this.listNotificationsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.markNotificationRead)
  async markNotificationRead(@Payload() payload: NotificationLookupMessage) {
    try {
      return await this.markNotificationReadUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.markAllNotificationsRead)
  async markAllNotificationsRead(@Payload() payload: CurrentUserProfileMessage) {
    try {
      return await this.markAllNotificationsReadUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.registerNotificationFcmToken)
  async registerNotificationFcmToken(@Payload() payload: RegisterNotificationFcmTokenMessage) {
    try {
      return await this.registerNotificationFcmTokenUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.revokeNotificationFcmToken)
  async revokeNotificationFcmToken(@Payload() payload: RevokeNotificationFcmTokenMessage) {
    try {
      return await this.revokeNotificationFcmTokenUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(USERS_MESSAGE_PATTERNS.createNotification)
  async createNotification(@Payload() payload: CreateNotificationMessage) {
    try {
      return await this.createNotificationUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
