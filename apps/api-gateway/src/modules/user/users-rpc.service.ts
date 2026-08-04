import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { measureServiceCall } from '@common/performance/request-context';
import type {
  AdminKycDetailMessage,
  AdminKycSummaryMessage,
  CreateNotificationMessage,
  CreateUserAddressMessage,
  CurrentUserKycMessage,
  CurrentUserProfileCompletionMessage,
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
  UserIdentityRecord,
  UserLookupMessage,
} from '@contracts';
import {
  CurrentUserProfileMessage,
  USERS_MESSAGE_PATTERNS,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class UsersRpcService {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  findAll(payload: ListUsersMessage = {}) {
    return this.send(USERS_MESSAGE_PATTERNS.findAll, payload);
  }

  getCurrentProfile(payload: CurrentUserProfileMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.getCurrentProfile, payload);
  }

  updateCurrentProfile(payload: UpdateCurrentUserProfileMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.updateCurrentProfile, payload);
  }

  uploadCurrentAvatar(payload: UploadCurrentUserAvatarMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.uploadCurrentAvatar, payload);
  }

  getProfileCompletion(payload: CurrentUserProfileCompletionMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.getProfileCompletion, payload);
  }

  listAddresses(payload: CurrentUserProfileMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.listAddresses, payload);
  }

  getDefaultAddress(payload: CurrentUserProfileMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.getDefaultAddress, payload);
  }

  createAddress(payload: CreateUserAddressMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.createAddress, payload);
  }

  updateAddress(payload: UpdateUserAddressMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.updateAddress, payload);
  }

  setDefaultAddress(payload: UserAddressLookupMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.setDefaultAddress, payload);
  }

  deleteAddress(payload: UserAddressLookupMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.deleteAddress, payload);
  }

  getMyKyc(payload: CurrentUserKycMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.getMyKyc, payload);
  }

  findPendingKycs(payload: PendingKycsLookupMessage = {}) {
    return this.send(USERS_MESSAGE_PATTERNS.findPendingKycs, payload);
  }

  getAdminKycDetail(payload: AdminKycDetailMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.getAdminKycDetail, payload);
  }

  getAdminKycSummary(payload: AdminKycSummaryMessage = {}) {
    return this.send(USERS_MESSAGE_PATTERNS.getAdminKycSummary, payload);
  }

  getKycUploadSignatures(payload: KycUploadSignaturesMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.getKycUploadSignatures, payload);
  }

  submitKyc(payload: SubmitKycMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.submitKyc, payload);
  }

  reviewKyc(payload: ReviewKycMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.reviewKyc, payload);
  }

  findById(id: string): Promise<UserIdentityRecord | null> {
    return this.send<UserIdentityRecord | null>(USERS_MESSAGE_PATTERNS.findById, { id });
  }

  getUserById(payload: UserLookupMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.getUserById, payload);
  }

  updateUser(payload: UpdateUserMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.updateUser, payload);
  }

  deleteUser(payload: UserLookupMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.deleteUser, payload);
  }

  listNotifications(payload: ListNotificationsMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.listNotifications, payload);
  }

  markNotificationRead(payload: NotificationLookupMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.markNotificationRead, payload);
  }

  markAllNotificationsRead(payload: CurrentUserProfileMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.markAllNotificationsRead, payload);
  }

  registerNotificationFcmToken(payload: RegisterNotificationFcmTokenMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.registerNotificationFcmToken, payload);
  }

  revokeNotificationFcmToken(payload: RevokeNotificationFcmTokenMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.revokeNotificationFcmToken, payload);
  }

  createNotification(payload: CreateNotificationMessage) {
    return this.send(USERS_MESSAGE_PATTERNS.createNotification, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await measureServiceCall(() => lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload)));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
