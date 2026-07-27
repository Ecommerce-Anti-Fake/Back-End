import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs an auth rejection without exposing the webhook secret', async () => {
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      controller.handleLiveInputWebhook('wrong-secret', {
        data: {
          input_id: 'input-1\nsecret=unsafe-value',
          event_type: 'live_input.connected\n',
          updated_at: '2026-07-25T02:00:00.000Z',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rpc.syncLiveProviderEvent).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'livestream.cloudflare.webhook.attempt',
        hasWebhookAuth: true,
        providerSessionId: 'input-1 secret=[REDACTED]',
        eventType: 'live_input.connected',
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'livestream.cloudflare.webhook.auth_rejected',
      }),
    );
    expect(
      JSON.stringify([...logSpy.mock.calls, ...warnSpy.mock.calls]),
    ).not.toContain('wrong-secret');
    expect(
      JSON.stringify([...logSpy.mock.calls, ...warnSpy.mock.calls]),
    ).not.toContain('unsafe-value');
  });

  it('logs payload rejection separately from delivery and auth failures', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    await expect(
      controller.handleLiveInputWebhook('webhook-secret', {
        data: {
          input_id: 'input-1',
          event_type: 'live_input.connected',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'livestream.cloudflare.webhook.payload_rejected',
      }),
    );
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

  it('logs catalog RPC failures separately so delivery can be diagnosed', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    rpc.syncLiveProviderEvent.mockRejectedValueOnce(
      new Error('catalog unavailable'),
    );

    await expect(
      controller.handleLiveInputWebhook('webhook-secret', {
        data: {
          input_id: 'input-1',
          event_type: 'live_input.connected',
          updated_at: '2026-07-25T02:00:00.000Z',
        },
      }),
    ).rejects.toThrow('catalog unavailable');
    expect(errorSpy).toHaveBeenCalledWith({
      metric: 'livestream.cloudflare.webhook.rpc_failed',
      providerSessionId: 'input-1',
      eventType: 'live_input.connected',
      errorType: 'Error',
    });
  });

  it('accepts and logs an unmatched provider input without forcing retries', async () => {
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    rpc.syncLiveProviderEvent.mockResolvedValueOnce({
      matched: false,
      providerSessionId: 'unknown-input',
    });

    await expect(
      controller.handleLiveInputWebhook('webhook-secret', {
        data: {
          input_id: 'unknown-input',
          event_type: 'live_input.disconnected',
          updated_at: '2026-07-25T02:00:00.000Z',
        },
      }),
    ).resolves.toEqual({ accepted: true });
    expect(warnSpy).toHaveBeenCalledWith({
      metric: 'livestream.cloudflare.webhook.unmatched',
      providerSessionId: 'unknown-input',
      eventType: 'live_input.disconnected',
      occurredAt: '2026-07-25T02:00:00.000Z',
    });
  });

  it('accepts and sanitizes a Cloudflare input error event', async () => {
    await controller.handleLiveInputWebhook('webhook-secret', {
      data: {
        input_id: 'input-1',
        event_type: 'live_input.errored',
        updated_at: '2026-07-25T02:00:01.000Z',
        live_input_errored: {
          error: {
            code: 'ERR_GOP_OUT_OF_RANGE',
            message: 'Invalid stream key secret-stream-key',
          },
          video_codec: 'H264',
          audio_codec: 'AAC',
        },
      },
    });

    expect(rpc.syncLiveProviderEvent).toHaveBeenCalledWith({
      providerSessionId: 'input-1',
      eventType: 'live_input.errored',
      occurredAt: '2026-07-25T02:00:01.000Z',
      errorCode: 'ERR_GOP_OUT_OF_RANGE',
      errorMessage: 'Invalid stream key [REDACTED]',
      videoCodec: 'H264',
      audioCodec: 'AAC',
    });
    expect(JSON.stringify(rpc.syncLiveProviderEvent.mock.calls)).not.toContain(
      'secret-stream-key',
    );
  });

  it('accepts the documented missing-subscription error and nanosecond timestamp', async () => {
    await controller.handleLiveInputWebhook('webhook-secret', {
      data: {
        input_id: 'input-1',
        event_type: 'live_input.errored',
        updated_at: '2024-07-09T18:07:51.077371662Z',
        live_input_errored: {
          error: {
            code: 'ERR_MISSING_SUBSCRIPTION',
            message: 'Unauthorized to start a live stream.',
          },
          video_codec: '',
          audio_codec: '',
        },
      },
    });

    expect(rpc.syncLiveProviderEvent).toHaveBeenCalledWith({
      providerSessionId: 'input-1',
      eventType: 'live_input.errored',
      occurredAt: '2024-07-09T18:07:51.077371662Z',
      errorCode: 'ERR_MISSING_SUBSCRIPTION',
      errorMessage: 'Unauthorized to start a live stream.',
      videoCodec: '',
      audioCodec: '',
    });
  });
});
