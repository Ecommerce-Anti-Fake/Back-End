import { Body, Controller, Get, Headers, MessageEvent, Param, Post, Query, Sse, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AccessTokenPayload } from '@contracts';
import { ActiveUserGuard, CurrentUserId, JwtAuthGuard } from '@security';
import {
  ListNotificationsQueryDto,
  NotificationFcmTokenResponseDto,
  NotificationResponseDto,
  NotificationsResponseDto,
  RegisterNotificationFcmTokenDto,
  RevokeNotificationFcmTokenDto,
  RevokeNotificationFcmTokenResponseDto,
} from '@users';
import { merge, Observable, of } from 'rxjs';
import { DashboardSseBrokerService } from '../users/dashboard-sse-broker.service';
import { NotificationSseBrokerService } from '../users/notification-sse-broker.service';
import { UsersRpcService } from '../users/users-rpc.service';

@ApiTags('Notification')
@Controller('user')
export class NotificationController {
  constructor(
    private readonly usersRpcService: UsersRpcService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
    private readonly notificationSseBrokerService: NotificationSseBrokerService,
    private readonly jwtService: JwtService,
  ) {}

  @ApiOperation({ summary: 'Lay danh sach thong bao cua user hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach thong bao va so luong chua doc.',
    type: NotificationsResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Get('notifications')
  listNotifications(@CurrentUserId() userId: string, @Query() query: ListNotificationsQueryDto) {
    return this.usersRpcService.listNotifications({
      userId,
      unreadOnly: query.unreadOnly,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @ApiOperation({ summary: 'Dang ky FCM token de nhan push notification tren trinh duyet' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'FCM token da duoc luu hoac kich hoat lai.',
    type: NotificationFcmTokenResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('notifications/fcm-token')
  async registerNotificationFcmToken(
    @CurrentUserId() userId: string,
    @Body() dto: RegisterNotificationFcmTokenDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.usersRpcService.registerNotificationFcmToken({
      userId,
      token: dto.token,
      deviceId: dto.deviceId,
      userAgent,
    });
    this.notificationSseBrokerService.notifyUser({ family: 'notification', reason: 'push_token_registered', userId });
    this.dashboardSseBrokerService.notifyAccount(userId, 'notification_changed');

    return result;
  }

  @ApiOperation({ summary: 'Thu hoi FCM token cua trinh duyet hien tai' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'So token da bi thu hoi.',
    type: RevokeNotificationFcmTokenResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('notifications/fcm-token/revoke')
  async revokeNotificationFcmToken(@CurrentUserId() userId: string, @Body() dto: RevokeNotificationFcmTokenDto) {
    const result = await this.usersRpcService.revokeNotificationFcmToken({
      userId,
      token: dto.token,
      deviceId: dto.deviceId,
    });
    this.notificationSseBrokerService.notifyUser({ family: 'notification', reason: 'push_token_revoked', userId });
    this.dashboardSseBrokerService.notifyAccount(userId, 'notification_changed');

    return result;
  }

  @ApiOperation({ summary: 'SSE invalidation stream cho notification list/unread count' })
  @Sse('notifications/events')
  notificationEvents(@Query('accessToken') accessToken?: string): Observable<MessageEvent> {
    const userId = this.verifySseAccessToken(accessToken).sub;

    return merge(
      of({
        type: 'notification.connected',
        data: { family: 'notification' },
      }),
      this.notificationSseBrokerService.streamForUser(userId),
    );
  }

  @ApiOperation({ summary: 'Danh dau mot thong bao da doc' })
  @ApiBearerAuth('access-token')
  @ApiParam({ name: 'notificationId', description: 'ID thong bao can danh dau da doc.' })
  @ApiOkResponse({
    description: 'Thong bao sau khi cap nhat.',
    type: NotificationResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('notifications/:notificationId/read')
  async markNotificationRead(@CurrentUserId() userId: string, @Param('notificationId') notificationId: string) {
    const result = await this.usersRpcService.markNotificationRead({ userId, notificationId });
    this.notificationSseBrokerService.notifyUser({ family: 'notification', reason: 'read', userId, notificationId });
    this.dashboardSseBrokerService.notifyAccount(userId, 'notification_changed');

    return result;
  }

  @ApiOperation({ summary: 'Danh dau tat ca thong bao la da doc' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({
    description: 'Danh sach thong bao sau khi cap nhat.',
    type: NotificationsResponseDto,
  })
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @Post('notifications/read-all')
  async markAllNotificationsRead(@CurrentUserId() userId: string) {
    const result = await this.usersRpcService.markAllNotificationsRead({ userId });
    this.notificationSseBrokerService.notifyUser({ family: 'notification', reason: 'read_all', userId });
    this.dashboardSseBrokerService.notifyAccount(userId, 'notification_changed');

    return result;
  }

  private verifySseAccessToken(accessToken?: string) {
    if (!accessToken) {
      throw new UnauthorizedException('Missing access token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = this.jwtService.verify<AccessTokenPayload>(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    if (!payload.sub || !payload.role || payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    return payload;
  }
}
