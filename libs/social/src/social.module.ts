import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import {
  CreateSocialCommentUseCase,
  CreateSocialCommentReplyUseCase,
  CreateSocialPostUseCase,
  GetSocialPostUseCase,
  ListSocialCommentRepliesUseCase,
  ListSocialCommentsUseCase,
  ListSocialPostsUseCase,
  RemoveSocialReactionUseCase,
  RemoveSocialCommentLikeUseCase,
  SetSocialCommentLikeUseCase,
  SetSocialReactionUseCase,
  ShareSocialPostUseCase,
  UpdateSocialPostVisibilityUseCase,
} from './application/use-cases';
import { SocialRepository } from './infrastructure/persistence/social.repository';
import { SocialRpcController } from './presentation/rpc/social.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [SocialRpcController],
  providers: [
    SocialRepository,
    ListSocialPostsUseCase,
    ListSocialCommentRepliesUseCase,
    ListSocialCommentsUseCase,
    GetSocialPostUseCase,
    CreateSocialPostUseCase,
    CreateSocialCommentUseCase,
    CreateSocialCommentReplyUseCase,
    SetSocialReactionUseCase,
    RemoveSocialReactionUseCase,
    SetSocialCommentLikeUseCase,
    RemoveSocialCommentLikeUseCase,
    ShareSocialPostUseCase,
    UpdateSocialPostVisibilityUseCase,
  ],
  exports: [SocialRepository],
})
export class SocialModule {}
