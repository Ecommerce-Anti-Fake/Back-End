import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { RealtimeLiveReactionService, RealtimePresenceService } from '@common';
import type { AuthenticatedUser } from '@contracts';
import {
  ActiveUserGuard,
  CurrentUser,
  CurrentUserId,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from '@security';
import {
  AgoraRtcAccessResponseDto,
  CreateLiveCommentDto,
  CreateLiveSessionDto,
  CreatedLiveSessionResponseDto,
  JoinLiveSessionDto,
  ListLiveCommentsQueryDto,
  ListLiveSessionsQueryDto,
  LiveCommentResponseDto,
  LiveSessionResponseDto,
  UpdateLiveCommentVisibilityDto,
  UpdateLiveSessionStatusDto,
} from '@live-commerce';
import { RateLimit } from '../../observability';
import { CatalogRpcService } from '../offer/catalog-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';
import { NotificationSseBrokerService } from '../user/notification-sse-broker.service';
import { UsersRpcService } from '../user/users-rpc.service';
import {
  AgoraRtcTokenService,
  agoraChannelName,
} from './agora-rtc-token.service';

@ApiTags('Live')
@Controller()
export class LiveController {
  private readonly logger = new Logger(LiveController.name);

  constructor(
    private readonly catalogRpcService: CatalogRpcService,
    private readonly liveReactionService: RealtimeLiveReactionService,
    private readonly presenceService: RealtimePresenceService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
    private readonly agoraRtcTokenService: AgoraRtcTokenService,
    private readonly usersRpcService: UsersRpcService,
    private readonly notificationSseBrokerService: NotificationSseBrokerService,
  ) {}

  @ApiOperation({ summary: 'Lay danh sach phien live commerce' })
  @ApiOkResponse({
    description: 'Danh sach phien live commerce.',
    type: LiveSessionResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get('live/sessions')
  listLiveSessions(
    @Query() query: ListLiveSessionsQueryDto,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.catalogRpcService.listLiveSessions({
      requesterUserId: requester?.id ?? null,
      filter: query.filter ?? 'all',
      q: query.q ?? null,
      shopId: query.shopId ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay chi tiet phien live commerce' })
  @ApiOkResponse({
    description: 'Chi tiet phien live commerce cong khai.',
    type: LiveSessionResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get('live/sessions/:sessionId')
  getLiveSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ) {
    return this.catalogRpcService.getLiveSession({
      sessionId,
      requesterUserId: requester?.id ?? null,
    });
  }

  @ApiOperation({ summary: 'Lay aggregate reaction counters cua phien live' })
  @ApiOkResponse({
    description:
      'Tong reaction ephemeral theo type, dung de REST recovery sau reconnect.',
  })
  @RateLimit({ profile: 'publicCatalog' })
  @Get('live/sessions/:sessionId/reactions')
  getLiveReactionAggregate(@Param('sessionId') sessionId: string) {
    return this.liveReactionService.getAggregate(sessionId);
  }

  @ApiOperation({ summary: 'Seller xem analytics cua phien livestream' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description:
      'Current viewers, interactions, reminders and attributed commerce.',
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('live/sessions/:sessionId/analytics')
  async getLiveAnalytics(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    const [durable, currentViewers, reactions] = await Promise.all([
      this.catalogRpcService.getLiveAnalytics({
        sessionId,
        requesterUserId,
        requesterRole: requester?.role,
      }),
      this.presenceService.countLiveViewers(sessionId),
      this.liveReactionService.getAggregate(sessionId),
    ]);

    return {
      ...(durable as Record<string, unknown>),
      currentViewers,
      reactions,
    };
  }

  @ApiOperation({ summary: 'Lay lich su binh luan cua phien live' })
  @ApiOkResponse({
    description:
      'Danh sach comment cua live session, dung cho reconnect/replay.',
    type: LiveCommentResponseDto,
    isArray: true,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @UseGuards(OptionalJwtAuthGuard)
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
      includeHidden: query.includeHidden === 'true',
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

  @ApiOperation({ summary: 'Admin hoac chu shop an/hien binh luan live' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Comment live sau khi cap nhat hien thi.',
    type: LiveCommentResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
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

  @ApiOperation({ summary: 'Admin hoac chu shop xoa binh luan live' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Comment live da bi xoa.',
    type: LiveCommentResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
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
    type: CreatedLiveSessionResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions')
  @Header('Cache-Control', 'no-store')
  async createLiveSession(
    @CurrentUserId() requesterUserId: string,
    @Body() dto: CreateLiveSessionDto,
  ) {
    this.agoraRtcTokenService.assertConfigured();
    const sessionId = randomUUID();
    const access = this.agoraRtcTokenService.issueToken({
      sessionId,
      clientId: dto.clientId,
      principalId: requesterUserId,
      role: 'PUBLISHER',
    });
    const result = await this.catalogRpcService.createLiveSession({
      sessionId,
      requesterUserId,
      shopId: dto.shopId,
      title: dto.title,
      description: dto.description ?? null,
      coverUrl: dto.coverUrl ?? null,
      startAt: dto.startAt,
      offerIds: dto.offerIds ?? [],
      voucherIds: dto.voucherIds ?? [],
    });
    this.logger.log({
      metric: 'livestream.agora.session.created',
      sessionId,
      channelName: agoraChannelName(sessionId),
    });
    this.dashboardSseBrokerService.notifyShop(
      shopIdFromResult(result) ?? dto.shopId,
      'live_changed',
    );

    return {
      ...(result as Record<string, unknown>),
      ...access,
    };
  }

  @ApiOperation({ summary: 'Xac nhan publisher da phat len Agora RTC' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Phien Agora da chuyen sang trang thai dang phat.',
    type: LiveSessionResponseDto,
  })
  @RateLimit({ profile: 'auth' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions/:sessionId/start')
  async startLiveSession(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() requesterUserId: string,
  ) {
    const result = await this.catalogRpcService.startLiveSession({
      sessionId,
      requesterUserId,
    });
    this.logger.log({
      metric: 'livestream.agora.publisher.started',
      sessionId,
    });
    const shopId = shopIdFromResult(result);
    if (shopId) {
      this.dashboardSseBrokerService.notifyShop(shopId, 'live_changed');
    }
    await this.notifyReminderRecipients(result);
    return publicStartResult(result);
  }

  @ApiOperation({ summary: 'Lay Agora RTC token de tham gia phien live' })
  @ApiOkResponse({
    description: 'Token ngan han; backend tu suy role va UID.',
    type: AgoraRtcAccessResponseDto,
  })
  @RateLimit({ profile: 'publicCatalog' })
  @UseGuards(OptionalJwtAuthGuard)
  @Post('live/sessions/:sessionId/join')
  @Header('Cache-Control', 'no-store')
  async joinLiveSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: JoinLiveSessionDto,
  ) {
    await this.assertActiveRequester(requester);
    return this.issueAgoraAccess(sessionId, requester, dto.clientId, 'auto');
  }

  @ApiOperation({
    summary: 'Alias cu: lay Agora publisher token',
    deprecated: true,
  })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: AgoraRtcAccessResponseDto })
  @RateLimit({ profile: 'auth' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions/:sessionId/broadcast-credentials')
  @Header('Cache-Control', 'no-store')
  getBroadcastCredentials(
    @Param('sessionId') sessionId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
    @Body() dto: JoinLiveSessionDto,
  ) {
    return this.issueAgoraAccess(sessionId, requester, dto.clientId, 'owner');
  }

  private async issueAgoraAccess(
    sessionId: string,
    requester: AuthenticatedUser | undefined,
    clientId: string,
    accessRole: 'owner' | 'auto',
  ) {
    const context = (await this.catalogRpcService.getLiveBroadcastContext({
      sessionId,
      requesterUserId: requester?.id ?? null,
      accessRole,
    })) as {
      streamProvider?: string | null;
      providerSessionId?: string | null;
      rtcRole?: 'PUBLISHER' | 'SUBSCRIBER';
    };
    if (
      context.streamProvider !== 'AGORA_RTC' ||
      context.providerSessionId !== agoraChannelName(sessionId) ||
      !context.rtcRole
    ) {
      throw new BadRequestException('Live session is not managed by Agora RTC');
    }
    return this.agoraRtcTokenService.issueToken({
      sessionId,
      clientId,
      principalId: requester?.id ?? null,
      role: context.rtcRole,
    });
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

  private async assertActiveRequester(
    requester: AuthenticatedUser | undefined,
  ) {
    if (!requester?.id) return;
    const user = await this.usersRpcService.findById(requester.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.accountStatus !== 'active') {
      throw new ForbiddenException('Account is not active');
    }
  }

  private async notifyReminderRecipients(result: unknown) {
    if (!result || typeof result !== 'object') return;
    const record = result as Record<string, unknown>;
    const sessionId = typeof record.id === 'string' ? record.id : null;
    const title =
      typeof record.title === 'string' ? record.title : 'Livestream';
    const userIds = Array.isArray(record.reminderUserIds)
      ? record.reminderUserIds.filter(
          (userId): userId is string => typeof userId === 'string',
        )
      : [];
    if (!sessionId || !userIds.length) return;

    const notifications = await Promise.allSettled(
      userIds.map((userId) =>
        this.usersRpcService.createNotification({
          userId,
          notificationType: 'LIVE_STARTED',
          title: 'Livestream da bat dau',
          body: `${title} dang phat truc tiep.`,
          targetType: 'LIVE_SESSION',
          targetId: sessionId,
          dedupeKey: `live-started:${sessionId}:${userId}`,
          eventName: 'notification.live.started.v1',
        }),
      ),
    );
    notifications.forEach((notification, index) => {
      if (
        notification.status === 'fulfilled' &&
        notificationWasCreated(notification.value)
      ) {
        this.notificationSseBrokerService.notifyUser({
          family: 'notification',
          reason: 'created',
          userId: userIds[index],
        });
      }
    });
    const failedCount = notifications.filter(
      (notification) => notification.status === 'rejected',
    ).length;
    if (failedCount) {
      this.logger.warn({
        metric: 'livestream.reminder.notification.pending_retry',
        sessionId,
        failedCount,
      });
      throw new ServiceUnavailableException(
        'Live-start notifications are pending retry',
      );
    }
  }
}

function shopIdFromResult(result: unknown) {
  if (result && typeof result === 'object' && 'shopId' in result) {
    const shopId = (result as { shopId?: unknown }).shopId;
    return typeof shopId === 'string' ? shopId : undefined;
  }

  return undefined;
}

function publicStartResult(result: unknown) {
  if (!result || typeof result !== 'object') return result;
  const session = { ...(result as Record<string, unknown>) };
  delete session.reminderUserIds;
  delete session.startedNow;
  return session;
}

function notificationWasCreated(value: unknown) {
  if (!value || typeof value !== 'object' || !('createdNow' in value)) {
    return true;
  }
  return (value as { createdNow?: unknown }).createdNow !== false;
}
