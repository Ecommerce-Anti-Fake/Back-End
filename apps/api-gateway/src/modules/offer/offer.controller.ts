import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  AllocateOfferBatchesDto,
  AdminOfferListQueryDto,
  ListOffersQueryDto,
  ListShopOffersQueryDto,
  OfferBatchLinkResponseDto,
  OfferListItemResponseDto,
  OfferResponseDto,
  PaginatedOfferListResponseDto,
  PaginatedAdminOfferListResponseDto,
  PublicOfferDetailResponseDto,
  CreateOfferDto,
  CreateOfferResponseDto,
  UpdateOfferDto,
} from '@offers';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from './catalog-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';

@ApiTags('Offer')
@Controller()
export class OfferController {
  constructor(
    private readonly catalogRpcService: CatalogRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Admin lay danh sach offer' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach offer theo trang thai ban va trang thai kiem duyet.',
    type: PaginatedAdminOfferListResponseDto,
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('offers/admin/list-offer')
  findAdminOffers(@Query() query: AdminOfferListQueryDto) {
    return this.catalogRpcService.findAdminOffers({
      offerStatus: query.offerStatus,
      moderationStatus: query.moderationStatus,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @ApiOperation({ summary: 'Tao offer moi cho shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'title',
        'categoryId',
        'description',
        'productImages',
        'price',
        'currency',
        'availableQuantity',
        'itemCondition',
      ],
      properties: {
        title: { type: 'string', example: 'Kem chong nang SPF50 - lo 2026' },
        categoryId: { type: 'string', example: 'category-id' },
        brandId: { type: 'string', example: 'brand-id' },
        description: { type: 'string', example: 'Mo ta san pham' },
        productImages: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Danh sach anh san pham, toi da 10 anh JPG/PNG/WEBP.',
        },
        price: { type: 'number', example: 150000 },
        currency: { type: 'string', enum: ['VND'], example: 'VND' },
        availableQuantity: { type: 'integer', example: 500 },
        itemCondition: { type: 'string', enum: ['new', 'used'], example: 'new' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Tao offer thanh cong va cho kiem duyet.',
    type: CreateOfferResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Shop khong thuoc user hien tai hoac du lieu offer khong hop le.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thieu access token hoac token khong hop le.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @UseInterceptors(
    FilesInterceptor('productImages', 10, {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Post('offers')
  async createOffer(
    @CurrentUserId() sellerUserId: string,
    @Body() dto: CreateOfferDto,
    @UploadedFiles()
    productImages: Array<{
      buffer: Buffer;
      mimetype: string;
      originalname?: string;
      size: number;
    }> = [],
  ) {
    const result = await this.catalogRpcService.createOffer({
      sellerUserId,
      categoryId: dto.categoryId,
      brandId: dto.brandId ?? null,
      distributionNodeId: dto.distributionNodeId ?? null,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      currency: dto.currency,
      itemCondition: dto.itemCondition,
      availableQuantity: dto.availableQuantity,
      verificationLevel: dto.verificationLevel,
      offerStatus: dto.offerStatus,
      parcelWeightGrams: dto.parcelWeightGrams,
      parcelLengthCm: dto.parcelLengthCm,
      parcelWidthCm: dto.parcelWidthCm,
      parcelHeightCm: dto.parcelHeightCm,
      productImages,
    });
    const createdShopId = shopIdFromResult(result);
    if (createdShopId) {
      this.dashboardSseBrokerService.notifyShop(createdShopId);
    }

    return {
      success: true,
      message: 'Offer created successfully and is pending moderation.',
    };
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
    const result = await this.catalogRpcService.updateOffer({
      offerId,
      sellerUserId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      availableQuantity: dto.availableQuantity,
      offerStatus: dto.offerStatus,
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

  @ApiOperation({ summary: 'Lay danh sach offer cua shop' })
  @ApiOkResponse({
    description: 'Danh sach offer active cua shop co phan trang.',
    type: PaginatedOfferListResponseDto,
  })
  @Get('shops/:shopId/offers')
  async findShopOffers(
    @Param('shopId') shopId: string,
    @Query() query: ListShopOffersQueryDto = {},
  ) {
    const result = await this.catalogRpcService.findOffers({
      shopId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });

    if (isPaginatedOfferResult(result)) {
      return toPaginatedOfferList(result);
    }

    const items = Array.isArray(result) ? result.map(toOfferListItem) : [];
    return {
      total: items.length,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      items,
    };
  }

  @ApiOperation({ summary: 'Lay danh sach offer' })
  @ApiOkResponse({
    description:
      'Danh sach offer public co phan trang. De trong filter params de lay offer active.',
    type: PaginatedOfferListResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('offers')
  async findOffers(@Query() query: ListOffersQueryDto) {
    const result = await this.catalogRpcService.findOffers({
      shopId: query.shopId,
      q: query.q,
      categoryId: query.categoryId,
      brandId: query.brandId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      location: query.location,
      verificationStatus: query.verificationStatus,
      shopType: query.shopType,
      sort: query.sort,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
    if (isPaginatedOfferResult(result)) {
      return toPaginatedOfferList(result);
    }

    return Array.isArray(result) ? result.map(toOfferListItem) : result;
  }

  @ApiOperation({ summary: 'Lay chi tiet mot offer' })
  @ApiParam({ name: 'id', description: 'ID offer can xem.' })
  @ApiOkResponse({
    description: 'Thong tin offer.',
    type: PublicOfferDetailResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('offers/:id')
  async findOfferById(@Param('id') id: string) {
    const offer = await this.catalogRpcService.findOfferById({ id });
    return toPublicOfferDetail(offer);
  }

  @ApiOperation({
    summary: 'Gan supply batch vao offer va dong bo available quantity',
  })
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
    return this.catalogRpcService.allocateOfferBatches({
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
    return this.catalogRpcService.findOfferBatchLinks({ offerId });
  }
}

function shopIdFromResult(result: unknown) {
  if (result && typeof result === 'object' && 'shopId' in result) {
    const shopId = (result as { shopId?: unknown }).shopId;
    return typeof shopId === 'string' ? shopId : undefined;
  }

  return undefined;
}

function toOfferListItem(offer: unknown): OfferListItemResponseDto {
  const record =
    offer && typeof offer === 'object'
      ? (offer as Record<string, unknown>)
      : {};

  return {
    id: stringValue(record.id),
    title: stringValue(record.title),
    price: numberValue(record.price),
    currency: stringValue(record.currency),
    availableQuantity: numberValue(record.availableQuantity),
    soldQuantity: numberValue(record.soldQuantity),
    verificationLevel: stringValue(record.verificationLevel),
    offerStatus: stringValue(record.offerStatus),
    categoryId: nullableStringValue(record.categoryId),
    brandId: nullableStringValue(record.brandId),
    thumbnailUrl: nullableStringValue(record.thumbnailUrl),
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt
        : new Date(stringValue(record.createdAt)),
  };
}

function toPublicOfferDetail(offer: unknown): PublicOfferDetailResponseDto {
  const record =
    offer && typeof offer === 'object'
      ? (offer as Record<string, unknown>)
      : {};

  return {
    id: stringValue(record.id),
    title: stringValue(record.title),
    description: stringValue(record.description),
    price: numberValue(record.price),
    currency: stringValue(record.currency),
    itemCondition: stringValue(record.itemCondition),
    availableQuantity: numberValue(record.availableQuantity),
    parcelWeightGrams: nullableNumberValue(record.parcelWeightGrams),
    parcelLengthCm: nullableNumberValue(record.parcelLengthCm),
    parcelWidthCm: nullableNumberValue(record.parcelWidthCm),
    parcelHeightCm: nullableNumberValue(record.parcelHeightCm),
    soldQuantity: numberValue(record.soldQuantity),
    verificationLevel: stringValue(record.verificationLevel),
    offerStatus: stringValue(record.offerStatus),
    categoryId: nullableStringValue(record.categoryId),
    brandId: nullableStringValue(record.brandId),
    gtin: nullableStringValue(record.gtin),
    verificationPolicy: stringValue(record.verificationPolicy),
    distributionNodeId: nullableStringValue(record.distributionNodeId),
    distributionNetworkId: nullableStringValue(record.distributionNetworkId),
    categoryName: stringValue(record.categoryName),
    productModelName: stringValue(record.productModelName),
    thumbnailUrl: nullableStringValue(record.thumbnailUrl),
    imageUrls: stringArrayValue(record.imageUrls),
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt
        : new Date(stringValue(record.createdAt)),
  };
}

function isPaginatedOfferResult(
  value: unknown,
): value is {
  total: unknown;
  page: unknown;
  pageSize: unknown;
  items: unknown[];
} {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray((value as { items?: unknown }).items),
  );
}

function toPaginatedOfferList(result: {
  total: unknown;
  page: unknown;
  pageSize: unknown;
  items: unknown[];
}): PaginatedOfferListResponseDto {
  return {
    total: numberValue(result.total),
    page: numberValue(result.page),
    pageSize: numberValue(result.pageSize),
    items: result.items.map(toOfferListItem),
  };
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function nullableStringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function stringArrayValue(value: unknown) {
  const seen = new Set<string>();
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== 'string') {
      return [];
    }
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      return [];
    }
    seen.add(trimmed);
    return [trimmed];
  });
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function nullableNumberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
