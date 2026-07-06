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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  SellerDashboardAnalyticsQueryDto,
  SellerDashboardAnalyticsResponseDto,
  SellerShopDailyMetricsQueryDto,
  SellerShopDailyMetricsResponseDto,
  SellerShopSummaryMetricsQueryDto,
  SellerShopSummaryMetricsResponseDto,
  SellerShopOrderStatusSummaryResponseDto,
  ShopBestSellingProductDto,
  ShopBestSellingProductsQueryDto,
} from '@orders';
import {
  CreateShopDto,
  MyShopResponseDto,
  PaginatedPublicShopSummaryResponseDto,
  PublicShopCategoryResponseDto,
  PublicShopDetailResponseDto,
  PublicShopSummaryResponseDto,
  PublicShopsQueryDto,
  ShopMutationResponseDto,
  UpdateShopProfileDto,
} from '@shops';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { ShopsRpcService } from './shops-rpc.service';

@ApiTags('Shop')
@Controller('shops')
export class ShopController {
  constructor(
    private readonly shopsRpcService: ShopsRpcService,
    private readonly ordersRpcService: OrdersRpcService,
  ) {}

  @ApiOperation({ summary: 'Tao shop moi cho user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: ShopMutationResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post()
  async create(
    @CurrentUserId() ownerUserId: string,
    @Body() dto: CreateShopDto,
  ) {
    await this.shopsRpcService.create({
      ownerUserId,
      shopName: dto.shopName,
      registrationType: dto.registrationType,
      businessType: dto.businessType,
      taxCode: dto.taxCode ?? null,
      warehouseAddress: dto.warehouseAddress ?? null,
      warehouseProvinceCode: dto.warehouseProvinceCode ?? null,
      warehouseProvinceName: dto.warehouseProvinceName ?? null,
      warehouseWardCode: dto.warehouseWardCode ?? null,
      warehouseWardName: dto.warehouseWardName ?? null,
      categoryIds: dto.categoryIds,
    });

    return { success: true };
  }

  @ApiOperation({ summary: 'Cap nhat ho so co ban cua shop hien tai' })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: {
    shopName: { type: 'string' }, businessType: { type: 'string' }, taxCode: { type: 'string', nullable: true },
    warehouseAddress: { type: 'string', nullable: true }, warehouseProvinceCode: { type: 'string', nullable: true },
    warehouseProvinceName: { type: 'string', nullable: true }, warehouseWardCode: { type: 'string', nullable: true },
    warehouseWardName: { type: 'string', nullable: true },
    avatar: { type: 'string', format: 'binary' }, banner: { type: 'string', format: 'binary' },
  } } })
  @ApiOkResponse({ type: ShopMutationResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ], { limits: { fileSize: 5 * 1024 * 1024 } }))
  @Patch(':shopId/profile')
  async updateProfile(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateShopProfileDto,
    @UploadedFiles() files: {
      avatar?: Array<{ buffer: Buffer; mimetype: string; originalname?: string; size: number }>;
      banner?: Array<{ buffer: Buffer; mimetype: string; originalname?: string; size: number }>;
    } = {},
  ) {
    await this.shopsRpcService.updateProfile({
      shopId,
      requesterUserId,
      shopName: dto.shopName,
      businessType: dto.businessType,
      taxCode: dto.taxCode ?? null,
      warehouseAddress: dto.warehouseAddress,
      warehouseProvinceCode: dto.warehouseProvinceCode,
      warehouseProvinceName: dto.warehouseProvinceName,
      warehouseWardCode: dto.warehouseWardCode,
      warehouseWardName: dto.warehouseWardName,
      avatar: files.avatar?.[0],
      banner: files.banner?.[0],
    });

    return { success: true };
  }

  @ApiOperation({ summary: 'Lay danh sach shop cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: MyShopResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('mine')
  findMine(@CurrentUserId() ownerUserId: string) {
    return this.shopsRpcService.findMine({ ownerUserId });
  }

  @ApiOperation({ summary: 'Lay 3 chi so tong quan cua shop theo khoang ngay' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: SellerShopSummaryMetricsResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/summary-metrics')
  getSummaryMetrics(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Query() query: SellerShopSummaryMetricsQueryDto,
  ) {
    return this.ordersRpcService.getSellerShopSummaryMetrics({
      shopId,
      requesterUserId,
      from: query.from,
      to: query.to,
    });
  }

  @ApiOperation({ summary: 'Lay doanh thu va so don hang theo ngay cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: SellerShopDailyMetricsResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/daily-metrics')
  getDailyMetrics(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Query() query: SellerShopDailyMetricsQueryDto,
  ) {
    return this.ordersRpcService.getSellerShopDailyMetrics({
      shopId,
      requesterUserId,
      days: query.days,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
  }

  @ApiOperation({ summary: 'Lay tong don hang theo trang thai cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: SellerShopOrderStatusSummaryResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/order-status-summary')
  getOrderStatusSummary(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    return this.ordersRpcService.getSellerShopOrderStatusSummary({
      shopId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Lay analytics dashboard cua shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: SellerDashboardAnalyticsResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':shopId/dashboard-analytics')
  getDashboardAnalytics(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Query() query: SellerDashboardAnalyticsQueryDto,
  ) {
    return this.ordersRpcService.getSellerShopDashboardAnalytics({
      shopId,
      requesterUserId,
      days: query.days,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach shop public co phan trang' })
  @ApiOkResponse({ type: PaginatedPublicShopSummaryResponseDto })
  @Get()
  findPublic(@Query() query: PublicShopsQueryDto) {
    return this.shopsRpcService.findPublic({
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }

  @ApiOperation({ summary: 'Lay thong tin shop public theo offer ID' })
  @ApiOkResponse({ type: PublicShopSummaryResponseDto })
  @Get('by-offer/:offerId')
  findByOfferId(@Param('offerId') offerId: string) {
    return this.shopsRpcService.findByOffer({ offerId });
  }

  @ApiOperation({ summary: 'Lay danh sach category public cua shop' })
  @ApiOkResponse({ type: PublicShopCategoryResponseDto, isArray: true })
  @Get(':shopId/categories')
  findCategoriesByShopId(@Param('shopId') shopId: string) {
    return this.shopsRpcService.findCategoriesByShopId({ shopId });
  }

  @ApiOperation({ summary: 'Lay danh sach san pham ban chay nhat cua shop' })
  @ApiOkResponse({ type: ShopBestSellingProductDto, isArray: true })
  @Get(':shopId/best-selling-products')
  getBestSellingProducts(
    @Param('shopId') shopId: string,
    @Query() query: ShopBestSellingProductsQueryDto,
  ) {
    return this.ordersRpcService.getShopBestSellingProducts({
      shopId,
      limit: query.limit ?? 10,
    });
  }

  @ApiOperation({ summary: 'Lay thong tin chi tiet mot shop' })
  @ApiOkResponse({ type: PublicShopDetailResponseDto })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.shopsRpcService.findById({ id });
  }
}
