import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RealtimeLiveReactionService } from '@common';
import type { AuthenticatedUser } from '@contracts';
import { ActiveUserGuard, CurrentUser, CurrentUserId, JwtAuthGuard, Roles, RolesGuard } from '@security';
import {
  CreateLiveCommentDto,
  CreateLiveSessionDto,
  ListLiveCommentsQueryDto,
  ListLiveSessionsQueryDto,
  LiveCommentResponseDto,
  LiveSessionResponseDto,
  UpdateLiveCommentVisibilityDto,
  UpdateLiveSessionStatusDto,
} from '@products';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';

@ApiTags('Live')
@Controller('products')
export class LiveController {
  constructor(
    private readonly catalogRpcService: CatalogRpcService,
    private readonly liveReactionService: RealtimeLiveReactionService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Lay danh sach phien live commerce' })
  @ApiOkResponse({
    description: 'Danh sach phien live commerce.',
    type: LiveSessionResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('live/sessions')
  listLiveSessions(@Query() query: ListLiveSessionsQueryDto, @CurrentUser() requester?: AuthenticatedUser) {
    return this.catalogRpcService.listLiveSessions({
      requesterUserId: requester?.id ?? null,
      filter: query.filter ?? 'all',
      q: query.q ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay aggregate reaction counters cua phien live' })
  @ApiOkResponse({
    description: 'Tong reaction ephemeral theo type, dung de REST recovery sau reconnect.',
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('live/sessions/:sessionId/reactions')
  getLiveReactionAggregate(@Param('sessionId') sessionId: string) {
    return this.liveReactionService.getAggregate(sessionId);
  }

  @ApiOperation({ summary: 'Lay lich su binh luan cua phien live' })
  @ApiOkResponse({
    description: 'Danh sach comment cua live session, dung cho reconnect/replay.',
    type: LiveCommentResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('live/sessions/:sessionId/comments')
  listLiveComments(
    @Param('sessionId') sessionId: string,
    @Query() query: ListLiveCommentsQueryDto,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.catalogRpcService.listLiveComments({
      sessionId,
      requesterUserId: requester?.id ?? null,
      requesterRole: requester?.role,
      cursor: query.cursor ?? null,
      since: query.since ?? null,
      pageSize: query.pageSize ?? null,
    });
  }

  @ApiOperation({ summary: 'Tao binh luan live qua REST fallback' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Comment live da duoc luu.',
    type: LiveCommentResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions/:sessionId/comments')
  createLiveComment(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: CreateLiveCommentDto,
  ) {
    return this.catalogRpcService.createLiveComment({
      sessionId,
      requesterUserId,
      requesterRole: requester?.role,
      body: dto.body,
      clientMessageId: dto.clientMessageId ?? null,
    });
  }

  @ApiOperation({ summary: 'Admin an/hien binh luan live' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Comment live sau khi cap nhat hien thi.',
    type: LiveCommentResponseDto,
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Patch('live/sessions/:sessionId/comments/:commentId/visibility')
  updateLiveCommentVisibility(
    @Param('sessionId') sessionId: string,
    @Param('commentId') commentId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: UpdateLiveCommentVisibilityDto,
  ) {
    return this.catalogRpcService.updateLiveCommentVisibility({
      sessionId,
      commentId,
      requesterUserId,
      requesterRole: requester?.role,
      visibility: dto.visibility,
    });
  }

  @ApiOperation({ summary: 'Admin xoa binh luan live' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Comment live da bi xoa.',
    type: LiveCommentResponseDto,
  })
  @Roles('admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Delete('live/sessions/:sessionId/comments/:commentId')
  deleteLiveComment(
    @Param('sessionId') sessionId: string,
    @Param('commentId') commentId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    return this.catalogRpcService.deleteLiveComment({
      sessionId,
      commentId,
      requesterUserId,
      requesterRole: requester?.role,
    });
  }

  @ApiOperation({ summary: 'Seller tao lich live commerce' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'Phien live commerce da duoc tao.',
    type: LiveSessionResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions')
  async createLiveSession(@CurrentUserId() requesterUserId: string, @Body() dto: CreateLiveSessionDto) {
    const result = await this.catalogRpcService.createLiveSession({
      requesterUserId,
      shopId: dto.shopId,
      title: dto.title,
      description: dto.description ?? null,
      coverUrl: dto.coverUrl ?? null,
      startAt: dto.startAt,
      playbackUrl: dto.playbackUrl ?? null,
      streamProvider: dto.streamProvider ?? null,
      streamProviderSessionId: dto.streamProviderSessionId ?? null,
      streamIngestUrl: dto.streamIngestUrl ?? null,
      streamLatencyTargetMs: dto.streamLatencyTargetMs ?? null,
      recordingUrl: dto.recordingUrl ?? null,
      recordingRetentionDays: dto.recordingRetentionDays ?? null,
      offerIds: dto.offerIds ?? [],
    });
    this.dashboardSseBrokerService.notifyShop(shopIdFromResult(result) ?? dto.shopId, 'live_changed');

    return result;
  }

  @ApiOperation({ summary: 'Cap nhat trang thai phien live commerce' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Phien live commerce sau khi cap nhat trang thai.',
    type: LiveSessionResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Patch('live/sessions/:sessionId/status')
  async updateLiveSessionStatus(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: UpdateLiveSessionStatusDto,
  ) {
    const result = await this.catalogRpcService.updateLiveSessionStatus({
      sessionId,
      requesterUserId,
      requesterRole: requester?.role,
      status: dto.status,
    });
    const shopId = shopIdFromResult(result);
    if (shopId) {
      this.dashboardSseBrokerService.notifyShop(shopId, 'live_changed');
    }

    return result;
  }

  @ApiOperation({ summary: 'Dang ky nhac lich live commerce' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Phien live commerce sau khi dang ky nhac lich.',
    type: LiveSessionResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions/:sessionId/reminders')
  remindLiveSession(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    return this.catalogRpcService.remindLiveSession({
      sessionId,
      requesterUserId,
      requesterRole: requester?.role,
    });
  }
}

function shopIdFromResult(result: unknown) {
  if (result && typeof result === 'object' && 'shopId' in result) {
    const shopId = (result as { shopId?: unknown }).shopId;
    return typeof shopId === 'string' ? shopId : undefined;
  }

  return undefined;
}
