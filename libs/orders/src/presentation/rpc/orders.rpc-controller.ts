import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ORDERS_MESSAGE_PATTERNS } from '@contracts';
import type {
  CreateRetailOrderMessage,
  CreateWholesaleOrderMessage,
  MarkOrderPaidMessage,
  OrderLookupMessage,
  CompleteOrderMessage,
  CancelOrderMessage,
} from '@contracts';
import { throwRpcException } from '@common';
import {
  CreateRetailOrderUseCase,
  CreateWholesaleOrderUseCase,
  GetOrderByIdUseCase,
  MarkOrderPaidUseCase,
  CompleteOrderUseCase,
  CancelOrderUseCase,
} from '../../application/use-cases';

@Controller()
export class OrdersRpcController {
  constructor(
    private readonly createRetailOrderUseCase: CreateRetailOrderUseCase,
    private readonly createWholesaleOrderUseCase: CreateWholesaleOrderUseCase,
    private readonly getOrderByIdUseCase: GetOrderByIdUseCase,
    private readonly markOrderPaidUseCase: MarkOrderPaidUseCase,
    private readonly completeOrderUseCase: CompleteOrderUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.createRetail)
  async createRetail(@Payload() payload: CreateRetailOrderMessage) {
    try {
      return await this.createRetailOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.createWholesale)
  async createWholesale(@Payload() payload: CreateWholesaleOrderMessage) {
    try {
      return await this.createWholesaleOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.findById)
  async findById(@Payload() payload: OrderLookupMessage) {
    try {
      return await this.getOrderByIdUseCase.execute(payload.id, payload.requesterUserId);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.markPaid)
  async markPaid(@Payload() payload: MarkOrderPaidMessage) {
    try {
      return await this.markOrderPaidUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.complete)
  async complete(@Payload() payload: CompleteOrderMessage) {
    try {
      return await this.completeOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(ORDERS_MESSAGE_PATTERNS.cancel)
  async cancel(@Payload() payload: CancelOrderMessage) {
    try {
      return await this.cancelOrderUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
