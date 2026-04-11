import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import type {
  ListUsersMessage,
  UpdateUserMessage,
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

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
