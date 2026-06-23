import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  FavoriteOfferMessage,
  FavoriteOffersLookupMessage,
} from '@contracts';
import {
  AddFavoriteOfferUseCase,
  ListFavoriteOffersUseCase,
  RemoveFavoriteOfferUseCase,
} from '../../application/use-cases';

@Controller()
export class FavoritesRpcController {
  constructor(
    private readonly listFavoriteOffersUseCase: ListFavoriteOffersUseCase,
    private readonly addFavoriteOfferUseCase: AddFavoriteOfferUseCase,
    private readonly removeFavoriteOfferUseCase: RemoveFavoriteOfferUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findFavoriteOffers)
  async findFavoriteOffers(@Payload() payload: FavoriteOffersLookupMessage) {
    try {
      return await this.listFavoriteOffersUseCase.execute(payload.userId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.addFavoriteOffer)
  async addFavoriteOffer(@Payload() payload: FavoriteOfferMessage) {
    try {
      return await this.addFavoriteOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.removeFavoriteOffer)
  async removeFavoriteOffer(@Payload() payload: FavoriteOfferMessage) {
    try {
      return await this.removeFavoriteOfferUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
