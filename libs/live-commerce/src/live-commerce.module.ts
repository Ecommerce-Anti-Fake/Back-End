import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import {
  CreateLiveCommentUseCase,
  CreateLiveSessionUseCase,
  DeleteLiveCommentUseCase,
  GetLiveSessionUseCase,
  GetLiveBroadcastContextUseCase,
  GetLiveAnalyticsUseCase,
  SyncLiveProviderEventUseCase,
  ListLiveCommentsUseCase,
  ListLiveSessionsUseCase,
  RemindLiveSessionUseCase,
  UpdateLiveCommentVisibilityUseCase,
  UpdateLiveSessionStatusUseCase,
} from './application/use-cases';
import { LiveCommerceRepository } from './infrastructure/persistence/live-commerce.repository';
import { LiveCommerceRpcController } from './presentation/rpc/live-commerce.rpc-controller';

@Module({
  imports: [PrismaModule],
  controllers: [LiveCommerceRpcController],
  providers: [
    LiveCommerceRepository,
    GetLiveSessionUseCase,
    GetLiveBroadcastContextUseCase,
    GetLiveAnalyticsUseCase,
    SyncLiveProviderEventUseCase,
    ListLiveSessionsUseCase,
    CreateLiveSessionUseCase,
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
