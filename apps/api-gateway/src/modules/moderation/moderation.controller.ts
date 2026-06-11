import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  AdminModerationCaseQueryDto,
  AdminOpenDisputeQueryDto,
  AdminRiskScoreQueryDto,
  AssignAdminDisputeDto,
  CalculateRiskScoreDto,
  OpenOrderDisputeDto,
  ResolveAdminDisputeDto,
  ResolveOrderDisputeDto,
  UpdateAdminDisputeCaseDto,
  UpdateAdminModerationCaseDto,
} from '@orders';
import { OrdersRpcService } from '../order/orders-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';

@ApiTags('Moderation')
@Controller('orders')
export class ModerationController {
  constructor(
    private readonly ordersRpcService: OrdersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Admin lay danh sach dispute dang mo' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/disputes/open')
  findAdminOpenDisputes(@Query() query: AdminOpenDisputeQueryDto) {
    return this.ordersRpcService.findAdminOpenDisputes({
      disputeStatus: query.disputeStatus ?? 'OPEN',
      assignedAdminUserId: query.assignedAdminUserId,
      reason: query.reason,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @ApiOperation({ summary: 'Admin xem danh sach risk score' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/risk-scores')
  listAdminRiskScores(@Query() query: AdminRiskScoreQueryDto) {
    return this.ordersRpcService.findAdminRiskScores(query);
  }

  @ApiOperation({ summary: 'Admin tinh lai risk score cho shop, offer hoac batch' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/risk-scores/recalculate')
  async calculateRiskScore(@CurrentUserId() requesterUserId: string, @Body() dto: CalculateRiskScoreDto) {
    const result = await this.ordersRpcService.calculateRiskScore({
      targetType: dto.targetType,
      targetId: dto.targetId,
      actorUserId: requesterUserId,
    });
    this.dashboardSseBrokerService.notifyAdminQueue('moderation');

    return result;
  }

  @ApiOperation({ summary: 'Admin xem moderation case queue tong hop' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/moderation-cases')
  listAdminModerationCases(@Query() query: AdminModerationCaseQueryDto) {
    return this.ordersRpcService.findAdminModerationCases(query);
  }

  @ApiOperation({ summary: 'Admin cap nhat moderation case tong hop' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Patch('admin/moderation-cases/:caseId')
  async updateAdminModerationCase(
    @Param('caseId') caseId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateAdminModerationCaseDto,
  ) {
    const result = await this.ordersRpcService.updateAdminModerationCase({
      caseId,
      requesterUserId,
      caseStatus: dto.caseStatus,
      internalNote: dto.internalNote ?? null,
      assignedAdminUserId: dto.assignedAdminUserId ?? null,
    });
    this.dashboardSseBrokerService.notifyAdminQueue('moderation');

    return result;
  }

  @ApiOperation({ summary: 'Admin lay chi tiet dispute va evidence' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Get('admin/disputes/:disputeId')
  getAdminDisputeDetail(@Param('disputeId') disputeId: string) {
    return this.ordersRpcService.getAdminDisputeDetail({ disputeId });
  }

  @ApiOperation({ summary: 'Admin nhan xu ly dispute' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/disputes/:disputeId/assign')
  assignAdminDispute(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: AssignAdminDisputeDto,
  ) {
    return this.ordersRpcService.assignAdminDispute({
      disputeId,
      requesterUserId,
      internalNote: dto.internalNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Admin cap nhat moderation case cua dispute' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/disputes/:disputeId/case')
  updateAdminDisputeCase(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: UpdateAdminDisputeCaseDto,
  ) {
    return this.ordersRpcService.updateAdminDisputeCase({
      disputeId,
      requesterUserId,
      caseStatus: dto.caseStatus,
      internalNote: dto.internalNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Admin resolve dispute' })
  @ApiBearerAuth('access-token')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Post('admin/disputes/:disputeId/resolve')
  resolveAdminDispute(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: ResolveAdminDisputeDto,
  ) {
    return this.ordersRpcService.resolveAdminDispute({
      disputeId,
      requesterUserId,
      resolution: dto.resolution,
      internalNote: dto.internalNote ?? null,
    });
  }

  @ApiOperation({ summary: 'Mo khiieu nai cho don da thanh toan hoac da hoan tat' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post(':id/disputes')
  openDispute(
    @Param('id') id: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: OpenOrderDisputeDto,
  ) {
    return this.ordersRpcService.openDispute({
      id,
      requesterUserId,
      reason: dto.reason,
    });
  }

  @ApiOperation({ summary: 'Lay danh sach evidence cua dispute' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('disputes/:disputeId/evidence')
  findDisputeEvidence(@Param('disputeId') disputeId: string, @CurrentUserId() requesterUserId: string) {
    return this.ordersRpcService.findDisputeEvidence({
      disputeId,
      requesterUserId,
    });
  }

  @ApiOperation({ summary: 'Seller xu ly khiieu nai dang mo' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('disputes/:disputeId/resolve')
  resolveDispute(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() requesterUserId: string,
    @Body() dto: ResolveOrderDisputeDto,
  ) {
    return this.ordersRpcService.resolveDispute({
      disputeId,
      requesterUserId,
      resolution: dto.resolution,
    });
  }
}
