import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  CreateSocialCommentUseCase,
  CreateSocialPostUseCase,
  ListSocialPostsUseCase,
  RemoveSocialReactionUseCase,
  SetSocialReactionUseCase,
  ShareSocialPostUseCase,
  UpdateSocialPostVisibilityUseCase,
} from './application/use-cases';
import { SocialRepository } from './infrastructure/persistence/social.repository';
import { SocialRpcController } from './presentation/rpc/social.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [SocialRpcController],
  providers: [
    SocialRepository,
    ListSocialPostsUseCase,
    CreateSocialPostUseCase,
    CreateSocialCommentUseCase,
    SetSocialReactionUseCase,
    RemoveSocialReactionUseCase,
    ShareSocialPostUseCase,
    UpdateSocialPostVisibilityUseCase,
  ],
  exports: [SocialRepository],
})
export class SocialModule {}
