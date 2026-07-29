import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
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
  UpdateLiveSessionOffersUseCase,
  UpdatePinnedLiveOfferUseCase,
  UpdateLiveSessionStatusUseCase,
} from './application/use-cases';
import { LiveCommerceRepository } from './infrastructure/persistence/live-commerce.repository';
import { LiveCommerceRpcController } from './presentation/rpc/live-commerce.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [LiveCommerceRpcController],
  providers: [
    LiveCommerceRepository,
    GetLiveSessionUseCase,
    GetLiveBroadcastContextUseCase,
    GetLiveAnalyticsUseCase,
    ListLiveSessionsUseCase,
    CreateLiveSessionUseCase,
    UpdatePinnedLiveOfferUseCase,
    UpdateLiveSessionOffersUseCase,
    StartLiveSessionUseCase,
    UpdateLiveSessionStatusUseCase,
    RemindLiveSessionUseCase,
    ListLiveCommentsUseCase,
    CreateLiveCommentUseCase,
    UpdateLiveCommentVisibilityUseCase,
    DeleteLiveCommentUseCase,
  ],
  exports: [LiveCommerceRepository],
})
export class LiveCommerceModule {}
