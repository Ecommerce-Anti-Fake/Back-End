import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import { AdminReportQueryDto, CreateReportDto, UpdateAdminReportDto } from '@orders';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';

@ApiTags('Report')
@Controller('orders')
export class ReportController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Buyer tao report cho order, offer hoac shop' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('reports')
  async createReport(@CurrentUserId() requesterUserId: string, @Body() dto: CreateReportDto) {
    const result = await this.ordersRpcService.createReport({
      requesterUserId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
      description: dto.description ?? null,
    });
    this.dashboardSseBrokerService.notifyAdminQueue('moderation');

    return result;
  }

  @ApiOperation({ summary: 'Lay danh sach report cua buyer hien tai' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('reports/mine')
  listMyReports(@CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.findMyReports({ requesterUserId });
  }

  @ApiOperation({ summary: 'Admin xem queue report cua buyer' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/reports')
  listAdminReports(@Query() query: AdminReportQueryDto) {
    return this.ordersRpcService.findAdminReports(query);
  }

  @ApiOperation({ summary: 'Admin cap nhat trang thai report' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Patch('admin/reports/:reportId')
  async updateAdminReport(
    @Param('reportId') reportId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateAdminReportDto,
  ) {
    const result = await this.ordersRpcService.updateAdminReport({
      reportId,
      requesterUserId,
      reportStatus: dto.reportStatus,
      internalNote: dto.internalNote ?? null,
    });
    this.dashboardSseBrokerService.notifyAdminQueue('moderation');

    return result;
  }
}
