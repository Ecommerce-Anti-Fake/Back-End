import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  AddReviewMediaBatchDto,
  CreateOfferReviewDto,
  GetReviewMediaUploadSignaturesDto,
  OfferMediaUploadSignatureResponseDto,
  OfferReviewResponseDto,
  OfferReviewsResponseDto,
  ReviewMediaResponseDto,
} from '@products';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Review')
@Controller('products')
export class ReviewController {
  constructor(private readonly catalogRpcService: CatalogRpcService) {}

  @ApiOperation({ summary: 'Lay danh sach danh gia cua offer' })
  @ApiOkResponse({
    description: 'Danh sach danh gia cua offer.',
    type: OfferReviewsResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('offers/:offerId/reviews')
  findOfferReviews(@Param('offerId') offerId: string) {
    return this.catalogRpcService.findOfferReviews({ offerId });
  }

  @ApiOperation({ summary: 'Tao danh gia cho offer da mua' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao danh gia thanh cong.',
    type: OfferReviewResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/reviews')
  createOfferReview(
    @Param('offerId') offerId: string,
    @CurrentUserId() fromUserId: string,
    @Body() dto: CreateOfferReviewDto,
  ) {
    return this.catalogRpcService.createOfferReview({
      offerId,
      fromUserId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
  }

  @ApiOperation({ summary: 'Tao hoac cap nhat danh gia cho mot san pham trong don hang' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh gia sau khi luu.',
    type: OfferReviewResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('order-items/:orderItemId/review')
  createOrderItemReview(
    @Param('orderItemId') orderItemId: string,
    @CurrentUserId() fromUserId: string,
    @Body() dto: CreateOfferReviewDto,
  ) {
    return this.catalogRpcService.createOrderItemReview({
      orderItemId,
      fromUserId,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay chu ky upload anh cho danh gia san pham' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach chu ky upload anh danh gia.',
    type: OfferMediaUploadSignatureResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @RateLimit({ profile: 'uploadSignature' })
  @Post('reviews/:reviewId/media/upload-signatures')
  getReviewMediaUploadSignatures(
    @Param('reviewId') reviewId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: GetReviewMediaUploadSignaturesDto,
  ) {
    return this.catalogRpcService.getReviewMediaUploadSignatures({
      reviewId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Luu metadata anh da upload cho danh gia san pham' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach anh danh gia da luu.',
    type: ReviewMediaResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('reviews/:reviewId/media')
  addReviewMediaBatch(
    @Param('reviewId') reviewId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AddReviewMediaBatchDto,
  ) {
    return this.catalogRpcService.addReviewMediaBatch({
      reviewId,
      requesterUserId,
      items: dto.items,
    });
  }
}
