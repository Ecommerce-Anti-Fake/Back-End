import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { CatalogRpcService } from '../offer/catalog-rpc.service';
import { DashboardSseBrokerService } from '../user/dashboard-sse-broker.service';
import { NotificationSseBrokerService } from '../user/notification-sse-broker.service';
import { UsersRpcService } from '../user/users-rpc.service';

type CloudflareLiveInputWebhook = {
  data?: {
    input_id?: unknown;
    event_type?: unknown;
    updated_at?: unknown;
  };
};

@Controller('webhooks/cloudflare/stream')
export class CloudflareStreamWebhookController {
  constructor(
    private readonly catalogRpcService: CatalogRpcService,
    private readonly configService: ConfigService,
    private readonly dashboardSseBrokerService: DashboardSseBrokerService,
    private readonly usersRpcService: UsersRpcService,
    private readonly notificationSseBrokerService: NotificationSseBrokerService,
  ) {}

  @Post('live-input')
  async handleLiveInputWebhook(
    @Headers('cf-webhook-auth') webhookSecret: string | undefined,
    @Body() payload: CloudflareLiveInputWebhook,
  ) {
    this.assertWebhookSecret(webhookSecret);
    const event = parseLiveInputEvent(payload);
    const result = await this.catalogRpcService.syncLiveProviderEvent(event);
    const shopId = shopIdFromUnknown(result);
    if (shopId) {
      this.dashboardSseBrokerService.notifyShop(shopId, 'live_changed');
    }
    await this.notifyReminderRecipients(result);
    return { accepted: true };
  }

  private async notifyReminderRecipients(result: unknown) {
    if (!result || typeof result !== 'object') return;
    const record = result as Record<string, unknown>;
    const sessionId = typeof record.id === 'string' ? record.id : null;
    const title = typeof record.title === 'string' ? record.title : 'Livestream';
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
          title: 'Livestream đã bắt đầu',
          body: `${title} đang phát trực tiếp.`,
          targetType: 'LIVE_SESSION',
          targetId: sessionId,
          dedupeKey: `live-started:${sessionId}:${userId}`,
          eventName: 'notification.live.started.v1',
        }),
      ),
    );
    notifications.forEach((notification, index) => {
      if (notification.status === 'fulfilled') {
        this.notificationSseBrokerService.notifyUser({
          family: 'notification',
          reason: 'created',
          userId: userIds[index],
        });
      }
    });
  }

  private assertWebhookSecret(received: string | undefined) {
    const expected =
      this.configService
        .get<string>('CLOUDFLARE_STREAM_LIVE_WEBHOOK_SECRET')
        ?.trim() ?? '';
    if (!expected || !received || !safeEqual(expected, received)) {
      throw new UnauthorizedException('Invalid livestream webhook secret');
    }
  }
}

function parseLiveInputEvent(payload: CloudflareLiveInputWebhook) {
  const inputId = payload?.data?.input_id;
  const eventType = payload?.data?.event_type;
  const updatedAt = payload?.data?.updated_at;
  if (
    typeof inputId !== 'string' ||
    !['live_input.connected', 'live_input.disconnected'].includes(
      String(eventType),
    ) ||
    typeof updatedAt !== 'string'
  ) {
    throw new BadRequestException('Invalid livestream webhook payload');
  }
  return {
    providerSessionId: inputId,
    eventType: eventType as
      | 'live_input.connected'
      | 'live_input.disconnected',
    occurredAt: updatedAt,
  };
}

function safeEqual(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function shopIdFromUnknown(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const shopId = (value as Record<string, unknown>).shopId;
  return typeof shopId === 'string' ? shopId : null;
}
