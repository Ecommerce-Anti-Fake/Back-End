import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
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
    live_input_errored?: {
      error?: {
        code?: unknown;
        message?: unknown;
      };
      video_codec?: unknown;
      audio_codec?: unknown;
    };
  };
};

type ParsedLiveInputEvent = {
  providerSessionId: string;
  eventType:
    | 'live_input.connected'
    | 'live_input.disconnected'
    | 'live_input.errored';
  occurredAt: string;
  errorCode?: string;
  errorMessage?: string;
  videoCodec?: string;
  audioCodec?: string;
};

@Controller('webhooks/cloudflare/stream')
export class CloudflareStreamWebhookController {
  private readonly logger = new Logger(CloudflareStreamWebhookController.name);

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
    this.logger.log({
      metric: 'livestream.cloudflare.webhook.attempt',
      hasWebhookAuth: Boolean(webhookSecret),
      providerSessionId: providerTextHint(payload?.data?.input_id),
      eventType: providerTextHint(payload?.data?.event_type),
    });
    try {
      this.assertWebhookSecret(webhookSecret);
    } catch (error) {
      this.logger.warn({
        metric: 'livestream.cloudflare.webhook.auth_rejected',
        hasWebhookAuth: Boolean(webhookSecret),
      });
      throw error;
    }

    let event: ParsedLiveInputEvent;
    try {
      event = parseLiveInputEvent(payload);
    } catch (error) {
      this.logger.warn({
        metric: 'livestream.cloudflare.webhook.payload_rejected',
        providerSessionId: providerTextHint(payload?.data?.input_id),
        eventType: providerTextHint(payload?.data?.event_type),
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
    this.logger.log({
      metric: 'livestream.cloudflare.webhook.received',
      providerSessionId: event.providerSessionId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      providerErrorCode: event.errorCode,
      providerErrorMessage: event.errorMessage,
      videoCodec: event.videoCodec,
      audioCodec: event.audioCodec,
    });
    let result: unknown;
    try {
      result = await this.catalogRpcService.syncLiveProviderEvent(event);
    } catch (error) {
      this.logger.error({
        metric: 'livestream.cloudflare.webhook.rpc_failed',
        providerSessionId: event.providerSessionId,
        eventType: event.eventType,
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
    if (isUnmatchedProviderEvent(result)) {
      this.logger.warn({
        metric: 'livestream.cloudflare.webhook.unmatched',
        providerSessionId: event.providerSessionId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
      });
    }
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

function parseLiveInputEvent(
  payload: CloudflareLiveInputWebhook,
): ParsedLiveInputEvent {
  const inputId = payload?.data?.input_id;
  const eventType = payload?.data?.event_type;
  const updatedAt = payload?.data?.updated_at;
  if (
    typeof inputId !== 'string' ||
    ![
      'live_input.connected',
      'live_input.disconnected',
      'live_input.errored',
    ].includes(String(eventType)) ||
    typeof updatedAt !== 'string'
  ) {
    throw new BadRequestException('Invalid livestream webhook payload');
  }
  const parsed = {
    providerSessionId: inputId,
    eventType: eventType as
      | 'live_input.connected'
      | 'live_input.disconnected'
      | 'live_input.errored',
    occurredAt: updatedAt,
  };
  if (parsed.eventType !== 'live_input.errored') return parsed;

  const error = payload.data?.live_input_errored?.error;
  if (
    !error ||
    typeof error.code !== 'string' ||
    !/^[A-Z0-9_]{1,64}$/.test(error.code) ||
    typeof error.message !== 'string'
  ) {
    throw new BadRequestException('Invalid livestream webhook error payload');
  }
  return {
    ...parsed,
    errorCode: error.code,
    errorMessage: sanitizeProviderText(error.message, 512),
    videoCodec: optionalProviderText(
      payload.data?.live_input_errored?.video_codec,
      64,
    ),
    audioCodec: optionalProviderText(
      payload.data?.live_input_errored?.audio_codec,
      64,
    ),
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

function optionalProviderText(value: unknown, maxLength: number) {
  return typeof value === 'string'
    ? sanitizeProviderText(value, maxLength)
    : undefined;
}

function providerTextHint(value: unknown) {
  return typeof value === 'string'
    ? sanitizeProviderText(value, 128)
    : undefined;
}

function sanitizeProviderText(value: string, maxLength: number) {
  return value
    .replace(/\p{Cc}+/gu, ' ')
    .replace(
      /\b(stream[\s_-]*key|api[\s_-]*token|authorization|token|secret)\b(\s*(?:[:=]|is)?\s*)[^\s,;]+/gi,
      '$1$2[REDACTED]',
    )
    .trim()
    .slice(0, maxLength);
}

function isUnmatchedProviderEvent(value: unknown) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>).matched === false,
  );
}
