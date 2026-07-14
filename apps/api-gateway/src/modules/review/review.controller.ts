import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  CreateOfferReviewDto,
  OfferReviewResponseDto,
  OfferReviewsResponseDto,
} from '@reviews';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';

@ApiTags('Review')
@Controller()
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

  @ApiOperation({
    summary: 'Tao hoac cap nhat danh gia cho mot san pham trong don hang',
  })
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

}
