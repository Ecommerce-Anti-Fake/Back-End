import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  AllocateOfferBatchesDto,
  ListOffersQueryDto,
  OfferBatchLinkResponseDto,
  OfferResponseDto,
  CreateOfferDto,
  UpdateOfferDto,
} from '@products';
import { RateLimit } from '../../observability';
import { DashboardSseBrokerService } from '../users/dashboard-sse-broker.service';
import { ProductsRpcService } from '../products/products-rpc.service';

@ApiTags('Offer')
@Controller('products')
export class OfferController {
  constructor(
    private readonly productsRpcService: ProductsRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Tao offer moi cho shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Tao offer thanh cong.',
    type: OfferResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Shop khong thuoc user hien tai hoac du lieu offer khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers')
  async createOffer(@CurrentUserId() sellerUserId: string, @Body() dto: CreateOfferDto) {
    const result = await this.productsRpcService.createOffer({
      sellerUserId,
      shopId: dto.shopId,
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
      distributionNodeId: dto.distributionNodeId ?? null,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      salesMode: dto.salesMode,
      minWholesaleQty: dto.minWholesaleQty,
      itemCondition: dto.itemCondition,
      availableQuantity: dto.availableQuantity,
      verificationLevel: dto.verificationLevel,
      offerStatus: dto.offerStatus,
      shippingProviderCodes: dto.shippingProviderCodes,
      parcelWeightGrams: dto.parcelWeightGrams,
      parcelLengthCm: dto.parcelLengthCm,
      parcelWidthCm: dto.parcelWidthCm,
      parcelHeightCm: dto.parcelHeightCm,
    });
    this.dashboardSseBrokerService.notifyShop(shopIdFromResult(result) ?? dto.shopId);

    return result;
  }

  @ApiOperation({ summary: 'Cap nhat thong tin ban hang cua offer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Cap nhat offer thanh cong.',
    type: OfferResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('offers/:offerId')
  async updateOffer(
    @Param('offerId') offerId: string,
    @CurrentUserId() sellerUserId: string,
    @Body() dto: UpdateOfferDto,
  ) {
    const result = await this.productsRpcService.updateOffer({
      offerId,
      sellerUserId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      availableQuantity: dto.availableQuantity,
      offerStatus: dto.offerStatus,
      shippingProviderCodes: dto.shippingProviderCodes,
      parcelWeightGrams: dto.parcelWeightGrams,
      parcelLengthCm: dto.parcelLengthCm,
      parcelWidthCm: dto.parcelWidthCm,
      parcelHeightCm: dto.parcelHeightCm,
    });
    const shopId = shopIdFromResult(result);
    if (shopId) {
      this.dashboardSseBrokerService.notifyShop(shopId);
    }

    return result;
  }

  @ApiOperation({ summary: 'Lay danh sach offer cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach offer cua seller.',
    type: OfferResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('seller/shops/:shopId/offers')
  findSellerShopOffers(
    @Param('shopId') shopId: string,
    @CurrentUserId() sellerUserId: string,
  ) {
    return this.productsRpcService.findOffers({
      shopId,
      sellerUserId,
      includeInactive: true,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach offer' })
  @ApiOkResponse({
    description: 'Danh sach offer.',
    type: OfferResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('offers')
  findOffers(@Query() query: ListOffersQueryDto) {
    return this.productsRpcService.findOffers({
      shopId: query.shopId,
      q: query.q,
      categoryId: query.categoryId,
      brandId: query.brandId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      location: query.location,
      verificationStatus: query.verificationStatus,
      shopType: query.shopType,
      salesChannel: query.salesChannel,
      sort: query.sort,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet mot offer' })
  @ApiParam({ name: 'id', description: 'ID offer can xem.' })
  @ApiOkResponse({
    description: 'Thong tin offer.',
    type: OfferResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('offers/:id')
  findOfferById(@Param('id') id: string) {
    return this.productsRpcService.findOfferById({ id });
  }

  @ApiOperation({ summary: 'Gan supply batch vao offer va dong bo available quantity' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Danh sach batch allocation cua offer sau khi cap nhat.',
    type: OfferBatchLinkResponseDto,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('offers/:offerId/batch-links')
  allocateOfferBatches(
    @Param('offerId') offerId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AllocateOfferBatchesDto,
  ) {
    return this.productsRpcService.allocateOfferBatches({
      offerId,
      requesterUserId,
      items: dto.items,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach batch allocation cua offer' })
  @ApiOkResponse({
    description: 'Danh sach batch allocation cua offer.',
    type: OfferBatchLinkResponseDto,
    isArray: true,
  })
  @Get('offers/:offerId/batch-links')
  findOfferBatchLinks(@Param('offerId') offerId: string) {
    return this.productsRpcService.findOfferBatchLinks({ offerId });
  }
}

function shopIdFromResult(result: unknown) {
  if (result && typeof result === 'object' && 'shopId' in result) {
    const shopId = (result as { shopId?: unknown }).shopId;
    return typeof shopId === 'string' ? shopId : undefined;
  }

  return undefined;
}
