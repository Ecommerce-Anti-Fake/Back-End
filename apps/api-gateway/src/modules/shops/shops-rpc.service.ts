import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateShopMessage,
  MyShopsLookupMessage,
  SHOPS_MESSAGE_PATTERNS,
  ShopLookupMessage,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ShopsRpcService {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  create(payload: CreateShopMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.create, payload);
  }

  findById(payload: ShopLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findById, payload);
  }

  findMine(payload: MyShopsLookupMessage) {
    return this.send(SHOPS_MESSAGE_PATTERNS.findMine, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
