import { Injectable } from '@nestjs/common';
import { UserIdentityPort } from '@contracts';
import type { UserIdentityRecord } from '@contracts';
import { UsersRpcService } from './users-rpc.service';

@Injectable()
export class UsersIdentityRpcAdapter implements UserIdentityPort {
  constructor(private readonly usersRpcService: UsersRpcService) {}

  findById(id: string): Promise<UserIdentityRecord | null> {
    return this.usersRpcService.findById(id);
  }

  findByIdentifier(): Promise<UserIdentityRecord | null> {
    throw new Error('findByIdentifier is not used in api-gateway');
  }

  create(): Promise<UserIdentityRecord> {
    throw new Error('create is not used in api-gateway');
  }
}
