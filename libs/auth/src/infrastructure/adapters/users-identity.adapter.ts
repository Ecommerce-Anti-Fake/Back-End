import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateUserIdentityMessage,
  UserIdentityPort,
  USERS_MESSAGE_PATTERNS,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import type { UserIdentityRecord } from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class UsersIdentityAdapter implements UserIdentityPort {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  async findById(id: string): Promise<UserIdentityRecord | null> {
    return this.send<UserIdentityRecord | null>(USERS_MESSAGE_PATTERNS.findById, { id });
  }

  async findByIdentifier(identifier: {
    email?: string | null;
    phone?: string | null;
  }): Promise<UserIdentityRecord | null> {
    return this.send<UserIdentityRecord | null>(USERS_MESSAGE_PATTERNS.findByIdentifier, identifier);
  }

  async create(data: CreateUserIdentityMessage): Promise<UserIdentityRecord> {
    return this.send<UserIdentityRecord>(USERS_MESSAGE_PATTERNS.create, data);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
