import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  ChatRequesterMessage,
  ChatThreadLookupMessage,
  SendChatMessageMessage,
  StartChatThreadMessage,
} from '@contracts';
import {
  GetChatThreadUseCase,
  ListChatThreadsUseCase,
  SendChatMessageUseCase,
  StartChatThreadUseCase,
} from '../../application/use-cases';

@Controller()
export class ChatRpcController {
  constructor(
    private readonly listChatThreadsUseCase: ListChatThreadsUseCase,
    private readonly getChatThreadUseCase: GetChatThreadUseCase,
    private readonly startChatThreadUseCase: StartChatThreadUseCase,
    private readonly sendChatMessageUseCase: SendChatMessageUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.findChatThreads)
  async findChatThreads(@Payload() payload: ChatRequesterMessage) {
    try {
      return await this.listChatThreadsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getChatThread)
  async getChatThread(@Payload() payload: ChatThreadLookupMessage) {
    try {
      return await this.getChatThreadUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.startChatThread)
  async startChatThread(@Payload() payload: StartChatThreadMessage) {
    try {
      return await this.startChatThreadUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.sendChatMessage)
  async sendChatMessage(@Payload() payload: SendChatMessageMessage) {
    try {
      return await this.sendChatMessageUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}

