import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { CloudflareStreamWebhookController } from './cloudflare-stream-webhook.controller';

describe('CloudflareStreamWebhookController', () => {
  const rpc = {
    syncLiveProviderEvent: jest.fn().mockResolvedValue({
      id: 'live-1',
      title: 'Live sale',
      reminderUserIds: ['buyer-1'],
    }),
  };
  const usersRpc = { createNotification: jest.fn().mockResolvedValue({}) };
  const notificationSse = { notifyUser: jest.fn() };
  const controller = new CloudflareStreamWebhookController(
    rpc as never,
    new ConfigService({
      CLOUDFLARE_STREAM_LIVE_WEBHOOK_SECRET: 'webhook-secret',
    }),
    { notifyShop: jest.fn() } as never,
    usersRpc as never,
    notificationSse as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects live input webhooks with an invalid secret', async () => {
    await expect(
      controller.handleLiveInputWebhook('wrong-secret', {
        data: {
          input_id: 'input-1',
          event_type: 'live_input.connected',
          updated_at: '2026-07-25T02:00:00.000Z',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rpc.syncLiveProviderEvent).not.toHaveBeenCalled();
  });

  it('syncs an authenticated Cloudflare connection event', async () => {
    await controller.handleLiveInputWebhook('webhook-secret', {
      data: {
        input_id: 'input-1',
        event_type: 'live_input.connected',
        updated_at: '2026-07-25T02:00:00.000Z',
      },
    });

    expect(rpc.syncLiveProviderEvent).toHaveBeenCalledWith({
      providerSessionId: 'input-1',
      eventType: 'live_input.connected',
      occurredAt: '2026-07-25T02:00:00.000Z',
    });
    expect(usersRpc.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-1',
        targetId: 'live-1',
        dedupeKey: 'live-started:live-1:buyer-1',
      }),
    );
  });
});
