import { PATH_METADATA } from '@nestjs/common/constants';
import { LiveController } from './live.controller';

describe('LiveController routes', () => {
  it('exposes live routes without the legacy products prefix', () => {
    expect(Reflect.getMetadata(PATH_METADATA, LiveController)).toBe('/');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.listLiveSessions),
    ).toBe('live/sessions');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.getLiveSession),
    ).toBe('live/sessions/:sessionId');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.getLiveReactionAggregate),
    ).toBe('live/sessions/:sessionId/reactions');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.getLiveAnalytics),
    ).toBe('live/sessions/:sessionId/analytics');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.listLiveComments),
    ).toBe('live/sessions/:sessionId/comments');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.createLiveComment),
    ).toBe('live/sessions/:sessionId/comments');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.updateLiveCommentVisibility),
    ).toBe('live/sessions/:sessionId/comments/:commentId/visibility');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.deleteLiveComment),
    ).toBe('live/sessions/:sessionId/comments/:commentId');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.createLiveSession),
    ).toBe('live/sessions');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.getBroadcastCredentials),
    ).toBe('live/sessions/:sessionId/broadcast-credentials');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.refreshLiveRecording),
    ).toBe('live/sessions/:sessionId/recording/refresh');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.updateLiveSessionStatus),
    ).toBe('live/sessions/:sessionId/status');
    expect(
      Reflect.getMetadata(PATH_METADATA, LiveController.prototype.remindLiveSession),
    ).toBe('live/sessions/:sessionId/reminders');
  });

  it('provisions Cloudflare and returns OBS credentials only to the creating seller', async () => {
    const catalogRpcService = {
      createLiveSession: jest.fn().mockResolvedValue({
        id: 'live-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        status: 'SCHEDULED',
      }),
    };
    const cloudflareStreamService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createLiveInput: jest.fn().mockResolvedValue({
        providerSessionId: 'input-1',
        playbackUrl:
          'https://customer-code.cloudflarestream.com/input-1/iframe',
        ingestUrl: 'rtmps://live.cloudflare.com:443/live/',
        streamKey: 'secret-stream-key',
        recordingRetentionDays: 30,
      }),
    };
    const controller = new LiveController(
      catalogRpcService as never,
      {} as never,
      {} as never,
      { notifyShop: jest.fn() } as never,
      cloudflareStreamService as never,
    );

    const result = await controller.createLiveSession('seller-1', {
      shopId: 'shop-1',
      title: 'Live hang chinh hang',
      startAt: '2026-07-25T02:00:00.000Z',
    });

    expect(catalogRpcService.createLiveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterUserId: 'seller-1',
        shopId: 'shop-1',
        streamProvider: 'CLOUDFLARE_STREAM',
        streamProviderSessionId: 'input-1',
        playbackUrl:
          'https://customer-code.cloudflarestream.com/input-1/iframe',
        streamIngestUrl: null,
        recordingRetentionDays: 30,
      }),
    );
    expect(result).toMatchObject({
      id: 'live-1',
      broadcastCredentials: {
        ingestUrl: 'rtmps://live.cloudflare.com:443/live/',
        streamKey: 'secret-stream-key',
      },
    });
  });
});
