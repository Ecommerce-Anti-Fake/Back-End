import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  CreateLiveCommentMessage,
  CreateLiveSessionMessage,
  DeleteLiveCommentMessage,
  GetLiveSessionMessage,
  GetLiveBroadcastContextMessage,
  GetLiveAnalyticsMessage,
  LiveSessionLookupMessage,
  ListLiveCommentsMessage,
  ListLiveSessionsMessage,
  UpdateLiveCommentVisibilityMessage,
  UpdateLiveSessionStatusMessage,
} from '@contracts';
import {
  CreateLiveCommentUseCase,
  CreateLiveSessionUseCase,
  DeleteLiveCommentUseCase,
  GetLiveSessionUseCase,
  GetLiveBroadcastContextUseCase,
  GetLiveAnalyticsUseCase,
  ListLiveCommentsUseCase,
  ListLiveSessionsUseCase,
  RemindLiveSessionUseCase,
  StartLiveSessionUseCase,
  UpdateLiveCommentVisibilityUseCase,
  UpdateLiveSessionStatusUseCase,
} from '../../application/use-cases';

@Controller()
export class LiveCommerceRpcController {
  constructor(
    private readonly listLiveSessionsUseCase: ListLiveSessionsUseCase,
    private readonly getLiveSessionUseCase: GetLiveSessionUseCase,
    private readonly getLiveBroadcastContextUseCase: GetLiveBroadcastContextUseCase,
    private readonly getLiveAnalyticsUseCase: GetLiveAnalyticsUseCase,
    private readonly createLiveSessionUseCase: CreateLiveSessionUseCase,
    private readonly startLiveSessionUseCase: StartLiveSessionUseCase,
    private readonly updateLiveSessionStatusUseCase: UpdateLiveSessionStatusUseCase,
    private readonly remindLiveSessionUseCase: RemindLiveSessionUseCase,
    private readonly listLiveCommentsUseCase: ListLiveCommentsUseCase,
    private readonly createLiveCommentUseCase: CreateLiveCommentUseCase,
    private readonly updateLiveCommentVisibilityUseCase: UpdateLiveCommentVisibilityUseCase,
    private readonly deleteLiveCommentUseCase: DeleteLiveCommentUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listLiveSessions)
  async listLiveSessions(@Payload() payload: ListLiveSessionsMessage) {
    try {
      return await this.listLiveSessionsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getLiveSession)
  async getLiveSession(@Payload() payload: GetLiveSessionMessage) {
    try {
      return await this.getLiveSessionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getLiveBroadcastContext)
  async getLiveBroadcastContext(
    @Payload() payload: GetLiveBroadcastContextMessage,
  ) {
    try {
      return await this.getLiveBroadcastContextUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getLiveAnalytics)
  async getLiveAnalytics(@Payload() payload: GetLiveAnalyticsMessage) {
    try {
      return await this.getLiveAnalyticsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createLiveSession)
  async createLiveSession(@Payload() payload: CreateLiveSessionMessage) {
    try {
      return await this.createLiveSessionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.startLiveSession)
  async startLiveSession(@Payload() payload: LiveSessionLookupMessage) {
    try {
      return await this.startLiveSessionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.updateLiveSessionStatus)
  async updateLiveSessionStatus(
    @Payload() payload: UpdateLiveSessionStatusMessage,
  ) {
    try {
      return await this.updateLiveSessionStatusUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.remindLiveSession)
  async remindLiveSession(@Payload() payload: LiveSessionLookupMessage) {
    try {
      return await this.remindLiveSessionUseCase.execute({
        sessionId: payload.sessionId,
        requesterUserId: payload.requesterUserId,
      });
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listLiveComments)
  async listLiveComments(@Payload() payload: ListLiveCommentsMessage) {
    try {
      return await this.listLiveCommentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createLiveComment)
  async createLiveComment(@Payload() payload: CreateLiveCommentMessage) {
    try {
      return await this.createLiveCommentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.updateLiveCommentVisibility)
  async updateLiveCommentVisibility(
    @Payload() payload: UpdateLiveCommentVisibilityMessage,
  ) {
    try {
      return await this.updateLiveCommentVisibilityUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.deleteLiveComment)
  async deleteLiveComment(@Payload() payload: DeleteLiveCommentMessage) {
    try {
      return await this.deleteLiveCommentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
