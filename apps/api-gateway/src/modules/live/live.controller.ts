import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
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
  CreateLiveCommentDto,
  CreateLiveSessionDto,
  CreatedLiveSessionResponseDto,
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
import { CloudflareStreamService } from './cloudflare-stream.service';

@ApiTags('Live')
@Controller()
export class LiveController {
  private readonly logger = new Logger(LiveController.name);

  constructor(
    private readonly catalogRpcService: CatalogRpcService,
    private readonly liveReactionService: RealtimeLiveReactionService,
    private readonly presenceService: RealtimePresenceService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
    private readonly cloudflareStreamService: CloudflareStreamService,
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
    const sessionId = randomUUID();
    const provisioned = this.cloudflareStreamService.isConfigured()
      ? await this.cloudflareStreamService.createLiveInput({
          sessionName: `${dto.shopId}: ${dto.title}`,
          sessionId,
          shopId: dto.shopId,
        })
      : null;
    let result: unknown;
    try {
      result = await this.catalogRpcService.createLiveSession({
        sessionId,
        requesterUserId,
        shopId: dto.shopId,
        title: dto.title,
        description: dto.description ?? null,
        coverUrl: dto.coverUrl ?? null,
        startAt: dto.startAt,
        playbackUrl: provisioned?.playbackUrl ?? dto.playbackUrl ?? null,
        streamProvider: provisioned
          ? 'CLOUDFLARE_STREAM'
          : (dto.streamProvider ?? null),
        streamProviderSessionId:
          provisioned?.providerSessionId ?? dto.streamProviderSessionId ?? null,
        streamIngestUrl: provisioned ? null : (dto.streamIngestUrl ?? null),
        streamLatencyTargetMs: dto.streamLatencyTargetMs ?? 8000,
        recordingUrl: dto.recordingUrl ?? null,
        recordingRetentionDays:
          provisioned?.recordingRetentionDays ??
          dto.recordingRetentionDays ??
          null,
        offerIds: dto.offerIds ?? [],
        voucherIds: dto.voucherIds ?? [],
      });
    } catch (error) {
      if (!provisioned) throw error;

      let context: { providerSessionId?: string | null };
      try {
        context = (await this.catalogRpcService.getLiveBroadcastContext({
          sessionId,
          requesterUserId,
        })) as {
          providerSessionId?: string | null;
        };
      } catch (reconciliationError) {
        if (
          reconciliationError instanceof HttpException &&
          reconciliationError.getStatus() === 404
        ) {
          try {
            await this.cloudflareStreamService.deleteLiveInput(
              provisioned.providerSessionId,
            );
          } catch {
            this.logger.error({
              metric: 'livestream.cloudflare.cleanup.failed',
              sessionId,
              providerSessionId: provisioned.providerSessionId,
              reason: 'db_create_failed',
            });
          }
        } else {
          this.logger.error({
            metric: 'livestream.cloudflare.db_commit.ambiguous',
            sessionId,
            providerSessionId: provisioned.providerSessionId,
            reason: 'reconciliation_unavailable',
          });
        }
        throw error;
      }

      if (context.providerSessionId !== provisioned.providerSessionId) {
        this.logger.error({
          metric: 'livestream.cloudflare.db_commit.ambiguous',
          sessionId,
          providerSessionId: provisioned.providerSessionId,
          reason: 'provider_session_mismatch',
        });
        throw error;
      }

      try {
        result = await this.catalogRpcService.getLiveSession({
          sessionId,
          requesterUserId,
        });
      } catch {
        this.logger.error({
          metric: 'livestream.cloudflare.db_commit.ambiguous',
          sessionId,
          providerSessionId: provisioned.providerSessionId,
          reason: 'committed_session_unavailable',
        });
        throw error;
      }
      this.logger.warn({
        metric: 'livestream.cloudflare.db_commit.recovered',
        sessionId,
        providerSessionId: provisioned.providerSessionId,
      });
    }
    this.logger.log({
      metric: 'livestream.cloudflare.db.persisted',
      sessionId,
      providerSessionId: provisioned?.providerSessionId,
    });
    this.dashboardSseBrokerService.notifyShop(
      shopIdFromResult(result) ?? dto.shopId,
      'live_changed',
    );

    if (!provisioned) return result;
    this.logger.log({
      metric: 'livestream.cloudflare.credentials.returned',
      sessionId,
      providerSessionId: provisioned.providerSessionId,
    });
    return {
      ...(result as Record<string, unknown>),
      broadcastCredentials: {
        ingestUrl: provisioned.ingestUrl,
        streamKey: provisioned.streamKey,
      },
    };
  }

  @ApiOperation({ summary: 'Lay cau hinh OBS cua phien live do seller so huu' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'RTMPS server va stream key cho OBS.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions/:sessionId/broadcast-credentials')
  @Header('Cache-Control', 'no-store')
  async getBroadcastCredentials(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    const context = (await this.catalogRpcService.getLiveBroadcastContext({
      sessionId,
      requesterUserId,
      requesterRole: requester?.role,
    })) as {
      streamProvider?: string | null;
      providerSessionId?: string | null;
      status?: string;
    };
    if (context.status === 'ENDED' || context.status === 'CANCELLED') {
      throw new BadRequestException(
        'Broadcast credentials are unavailable for terminal sessions',
      );
    }
    if (
      context.streamProvider !== 'CLOUDFLARE_STREAM' ||
      !context.providerSessionId
    ) {
      throw new BadRequestException(
        'Broadcast credentials are managed outside Cloudflare Stream',
      );
    }
    const credentials =
      await this.cloudflareStreamService.getBroadcastCredentials(
        context.providerSessionId,
      );
    return {
      ingestUrl: credentials.ingestUrl,
      streamKey: credentials.streamKey,
    };
  }

  @ApiOperation({ summary: 'Kiem tra va gan ban ghi replay tu Cloudflare' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Trang thai san sang cua ban ghi replay.' })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('live/sessions/:sessionId/recording/refresh')
  async refreshLiveRecording(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() requesterUserId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    const context = (await this.catalogRpcService.getLiveBroadcastContext({
      sessionId,
      requesterUserId,
      requesterRole: requester?.role,
    })) as {
      streamProvider?: string | null;
      providerSessionId?: string | null;
    };
    if (
      context.streamProvider !== 'CLOUDFLARE_STREAM' ||
      !context.providerSessionId
    ) {
      throw new BadRequestException(
        'Recording is managed outside Cloudflare Stream',
      );
    }
    const recording =
      await this.cloudflareStreamService.getLatestReadyRecording(
        context.providerSessionId,
      );
    if (!recording) return { ready: false };

    const session = await this.catalogRpcService.syncLiveProviderEvent({
      providerSessionId: context.providerSessionId,
      eventType: 'recording.ready',
      occurredAt: new Date().toISOString(),
      recordingUrl: recording.recordingUrl,
    });
    const shopId = shopIdFromResult(session);
    if (shopId) {
      this.dashboardSseBrokerService.notifyShop(shopId, 'live_changed');
    }
    return { ready: true, recordingUrl: recording.recordingUrl };
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
    const terminalStatus = ['ENDED', 'CANCELLED'].includes(dto.status);
    const providerContext = terminalStatus
      ? ((await this.catalogRpcService.getLiveBroadcastContext({
          sessionId,
          requesterUserId,
          requesterRole: requester?.role,
        })) as {
          streamProvider?: string | null;
          providerSessionId?: string | null;
        })
      : null;
    const result = await this.catalogRpcService.updateLiveSessionStatus({
      sessionId,
      requesterUserId,
      requesterRole: requester?.role,
      status: dto.status,
    });
    if (
      providerContext?.streamProvider === 'CLOUDFLARE_STREAM' &&
      providerContext.providerSessionId
    ) {
      await this.cloudflareStreamService.disableLiveInput(
        providerContext.providerSessionId,
      );
    }
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
