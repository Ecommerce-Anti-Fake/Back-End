import { Module } from '@nestjs/common';
import { PrismaModule } from '@database/prisma/prisma.module';
import { MediaModule } from '@media';
import {
  AddReviewMediaBatchUseCase,
  CreateOfferReviewUseCase,
  CreateOrderItemReviewUseCase,
  GetReviewMediaUploadSignaturesUseCase,
  ListOfferReviewsUseCase,
} from './application/use-cases';
import { ReviewsRepository } from './infrastructure/persistence/reviews.repository';
import { ReviewsRpcController } from './presentation/rpc/reviews.rpc-controller';

@Module({
  imports: [PrismaModule, MediaModule],
  controllers: [ReviewsRpcController],
  providers: [
    ReviewsRepository,
    ListOfferReviewsUseCase,
    CreateOfferReviewUseCase,
    CreateOrderItemReviewUseCase,
    GetReviewMediaUploadSignaturesUseCase,
    AddReviewMediaBatchUseCase,
  ],
  exports: [ReviewsRepository],
})
export class ReviewsModule {}
