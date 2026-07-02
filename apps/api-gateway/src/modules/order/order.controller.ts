import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@contracts';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  CreateOrderDto,
  PaginatedSellerShopOrderResponseDto,
  SellerShopOrdersQueryDto,
  UpdateOrderFulfillmentDto,
} from '@orders';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';
import { OrdersRpcService } from './orders-rpc.service';

@ApiTags('Order')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Tao don hang tu offer' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post()
  async create(@CurrentUserId() buyerUserId: string, @Body() dto: CreateOrderDto) {
    const result = await this.ordersRpcService.create({
      buyerUserId,
      buyerShopId: dto.buyerShopId ?? null,
      buyerDistributionNodeId: dto.buyerDistributionNodeId ?? null,
      offerId: dto.offerId,
      quantity: dto.quantity,
      affiliateCode: dto.affiliateCode ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      shippingName: dto.shippingName ?? null,
      shippingPhone: dto.shippingPhone ?? null,
      shippingAddress: dto.shippingAddress ?? null,
      shippingDistrictId: dto.shippingDistrictId ?? null,
      shippingDistrictName: dto.shippingDistrictName ?? null,
      shippingWardCode: dto.shippingWardCode ?? null,
      shippingWardName: dto.shippingWardName ?? null,
      shippingProviderCode: dto.shippingProviderCode ?? null,
      shippingServiceId: dto.shippingServiceId ?? null,
      shippingServiceTypeId: dto.shippingServiceTypeId ?? null,
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result, buyerUserId);

    return result;
  }

  @ApiOperation({ summary: 'Lay danh sach don hang cua nguoi dung hien tai' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('mine')
  findMine(@CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.findMine({ requesterUserId });
  }

  @ApiOperation({ summary: 'Seller lay danh sach don cua mot shop' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: PaginatedSellerShopOrderResponseDto })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('seller/shops/:shopId')
  findSellerShopOrders(
    @Param('shopId') shopId: string,
    @CurrentUserId() requesterUserId: string,
    @Query() query: SellerShopOrdersQueryDto,
  ) {
    return this.ordersRpcService.findSellerShopOrders({
      shopId,
      requesterUserId,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @ApiOperation({ summary: 'Admin lay danh sach don hang' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/orders')
  findAdminOrders(
    @Query('orderStatus') orderStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.ordersRpcService.findAdminOrders({
      orderStatus,
      paymentStatus,
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortOrder,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet mot don hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':id')
  findById(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.findById({ id, requesterUserId });
  }

  @ApiOperation({ summary: 'Lay fulfillment audit timeline cua don hang', deprecated: true })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':id/fulfillment-audit')
  getFulfillmentAudit(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.ordersRpcService.getFulfillmentAudit({ id, requesterUserId, requesterRole: requester?.role });
  }

  @ApiOperation({ summary: 'Lay order audit timeline cua don hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get(':id/audit')
  getOrderAudit(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.ordersRpcService.getFulfillmentAudit({ id, requesterUserId, requesterRole: requester?.role });
  }

  @ApiOperation({ summary: 'Distributor nhan don si da giao vao ton kho' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/receive-inventory')
  async receiveWholesaleInventory(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    const result = await this.ordersRpcService.receiveWholesaleInventory({
      id,
      requesterUserId,
    });
    this.dashboardSseBrokerService.notifyAccount(requesterUserId);

    return result;
  }

  @ApiOperation({ summary: 'Seller cap nhat trang thai xu ly va giao hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/fulfillment')
  async updateFulfillment(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateOrderFulfillmentDto,
  ) {
    const result = await this.ordersRpcService.updateFulfillment({
      id,
      requesterUserId,
      fulfillmentStatus: dto.fulfillmentStatus,
    });
    this.dashboardSseBrokerService.notifyOrderChanged(result);

    return result;
  }

  @ApiOperation({ summary: 'Seller xac nhan hoan tat don hang' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.complete({
      id,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Buyer hoac seller huy don hang khi con pending' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.cancel({
      id,
      requesterUserId,
    });
  }
}
