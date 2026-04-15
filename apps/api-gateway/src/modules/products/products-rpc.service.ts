import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  CreateOfferMessage,
  ListOffersMessage,
  PRODUCTS_MESSAGE_PATTERNS,
  ProductModelLookupMessage,
  USERS_SERVICE_CLIENT,
} from '@contracts';
import { throwHttpExceptionFromRpc } from '@common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ProductsRpcService {
  constructor(
    @Inject(USERS_SERVICE_CLIENT)
    private readonly usersClient: ClientProxy,
  ) {}

  findModels() {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findModels, {});
  }

  findModelById(payload: ProductModelLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findModelById, payload);
  }

  createOffer(payload: CreateOfferMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.createOffer, payload);
  }

  findOffers(payload: ListOffersMessage = {}) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOffers, payload);
  }

  findOfferById(payload: ProductModelLookupMessage) {
    return this.send(PRODUCTS_MESSAGE_PATTERNS.findOfferById, payload);
  }

  private async send<TResult>(pattern: string, payload: unknown): Promise<TResult> {
    try {
      return await lastValueFrom(this.usersClient.send<TResult, unknown>(pattern, payload));
    } catch (error) {
      throwHttpExceptionFromRpc(error);
    }
  }
}
