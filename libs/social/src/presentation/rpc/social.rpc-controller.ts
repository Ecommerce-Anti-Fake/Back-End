import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { throwRpcException } from '@common';
import { PRODUCTS_MESSAGE_PATTERNS } from '@contracts';
import type {
  CreateSocialCommentMessage,
  CreateSocialCommentReplyMessage,
  CreateSocialPostMessage,
  ListSocialCommentRepliesMessage,
  ListSocialCommentsMessage,
  ListSocialPostsMessage,
  SetSocialReactionMessage,
  SocialPostLookupMessage,
  UpdateSocialPostVisibilityMessage,
} from '@contracts';
import {
  CreateSocialCommentUseCase,
  CreateSocialCommentReplyUseCase,
  CreateSocialPostUseCase,
  GetSocialPostUseCase,
  ListSocialCommentRepliesUseCase,
  ListSocialCommentsUseCase,
  ListSocialPostsUseCase,
  RemoveSocialReactionUseCase,
  SetSocialReactionUseCase,
  ShareSocialPostUseCase,
  UpdateSocialPostVisibilityUseCase,
} from '../../application/use-cases';

@Controller()
export class SocialRpcController {
  constructor(
    private readonly listSocialPostsUseCase: ListSocialPostsUseCase,
    private readonly getSocialPostUseCase: GetSocialPostUseCase,
    private readonly listSocialCommentRepliesUseCase: ListSocialCommentRepliesUseCase,
    private readonly listSocialCommentsUseCase: ListSocialCommentsUseCase,
    private readonly createSocialPostUseCase: CreateSocialPostUseCase,
    private readonly createSocialCommentUseCase: CreateSocialCommentUseCase,
    private readonly createSocialCommentReplyUseCase: CreateSocialCommentReplyUseCase,
    private readonly setSocialReactionUseCase: SetSocialReactionUseCase,
    private readonly removeSocialReactionUseCase: RemoveSocialReactionUseCase,
    private readonly shareSocialPostUseCase: ShareSocialPostUseCase,
    private readonly updateSocialPostVisibilityUseCase: UpdateSocialPostVisibilityUseCase,
  ) {}

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listSocialPosts)
  async listSocialPosts(@Payload() payload: ListSocialPostsMessage) {
    try {
      return await this.listSocialPostsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.getSocialPost)
  async getSocialPost(@Payload() payload: SocialPostLookupMessage) {
    try {
      return await this.getSocialPostUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listSocialComments)
  async listSocialComments(@Payload() payload: ListSocialCommentsMessage) {
    try {
      return await this.listSocialCommentsUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.listSocialCommentReplies)
  async listSocialCommentReplies(
    @Payload() payload: ListSocialCommentRepliesMessage,
  ) {
    try {
      return await this.listSocialCommentRepliesUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createSocialPost)
  async createSocialPost(@Payload() payload: CreateSocialPostMessage) {
    try {
      return await this.createSocialPostUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createSocialComment)
  async createSocialComment(@Payload() payload: CreateSocialCommentMessage) {
    try {
      return await this.createSocialCommentUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.createSocialCommentReply)
  async createSocialCommentReply(
    @Payload() payload: CreateSocialCommentReplyMessage,
  ) {
    try {
      return await this.createSocialCommentReplyUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.setSocialReaction)
  async setSocialReaction(@Payload() payload: SetSocialReactionMessage) {
    try {
      return await this.setSocialReactionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.removeSocialReaction)
  async removeSocialReaction(@Payload() payload: SetSocialReactionMessage) {
    try {
      return await this.removeSocialReactionUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.shareSocialPost)
  async shareSocialPost(@Payload() payload: SocialPostLookupMessage) {
    try {
      return await this.shareSocialPostUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }

  @MessagePattern(PRODUCTS_MESSAGE_PATTERNS.updateSocialPostVisibility)
  async updateSocialPostVisibility(
    @Payload() payload: UpdateSocialPostVisibilityMessage,
  ) {
    try {
      return await this.updateSocialPostVisibilityUseCase.execute(payload);
    } catch (error) {
      throwRpcException(error);
    }
  }
}
