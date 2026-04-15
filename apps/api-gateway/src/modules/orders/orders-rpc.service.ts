import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateRetailOrderMessage,
  CreateWholesaleOrderMessage,
  MarkOrderPaidMessage,
  ORDERS_MESSAGE_PATTERNS,
  OrderLookupMessage,
  CompleteOrderMessage,
  CancelOrderMessage,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OrdersRpcService {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  createRetail(payload: CreateRetailOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.createRetail, payload);
  }

  createWholesale(payload: CreateWholesaleOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.createWholesale, payload);
  }

  findById(payload: OrderLookupMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.findById, payload);
  }

  markPaid(payload: MarkOrderPaidMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.markPaid, payload);
  }

  complete(payload: CompleteOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.complete, payload);
  }

  cancel(payload: CancelOrderMessage) {
    return this.send(ORDERS_MESSAGE_PATTERNS.cancel, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
