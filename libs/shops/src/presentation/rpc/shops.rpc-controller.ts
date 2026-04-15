import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SHOPS_MESSAGE_PATTERNS } from '@contracts';
import type {
  CreateShopMessage,
  MyShopsLookupMessage,
  ShopLookupMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  CreateShopUseCase,
  GetShopByIdUseCase,
  ListMyShopsUseCase,
} from '../../application/use-cases';

@Controller()
export class ShopsRpcController {
  constructor(
    private readonly createShopUseCase: CreateShopUseCase,
    private readonly getShopByIdUseCase: GetShopByIdUseCase,
    private readonly listMyShopsUseCase: ListMyShopsUseCase,
  ) {}

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.create)
  async create(@Payload() payload: CreateShopMessage) {
    try {
      return await this.createShopUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findById)
  async findById(@Payload() payload: ShopLookupMessage) {
    try {
      return await this.getShopByIdUseCase.execute(payload.id);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(SHOPS_MESSAGE_PATTERNS.findMine)
  async findMine(@Payload() payload: MyShopsLookupMessage) {
    try {
      return await this.listMyShopsUseCase.execute(payload.ownerUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
