import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { LiveController } from './live.controller';

describe('LiveController routes', () => {
  it('exposes live routes without the legacy products prefix', () => {
    /* eslint-disable @typescript-eslint/unbound-method -- method objects are metadata targets and are never invoked */
    expect(Reflect.getMetadata(PATH_METADATA, LiveController)).toBe('/');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.listLiveSessions,
      ),
    ).toBe('live/sessions');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.getLiveSession,
      ),
    ).toBe('live/sessions/:sessionId');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.getLiveReactionAggregate,
      ),
    ).toBe('live/sessions/:sessionId/reactions');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.getLiveAnalytics,
      ),
    ).toBe('live/sessions/:sessionId/analytics');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.listLiveComments,
      ),
    ).toBe('live/sessions/:sessionId/comments');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.createLiveComment,
      ),
    ).toBe('live/sessions/:sessionId/comments');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.updateLiveCommentVisibility,
      ),
    ).toBe('live/sessions/:sessionId/comments/:commentId/visibility');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.deleteLiveComment,
      ),
    ).toBe('live/sessions/:sessionId/comments/:commentId');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.createLiveSession,
      ),
    ).toBe('live/sessions');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.startLiveSession,
      ),
    ).toBe('live/sessions/:sessionId/start');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.getBroadcastCredentials,
      ),
    ).toBe('live/sessions/:sessionId/broadcast-credentials');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.refreshLiveRecording,
      ),
    ).toBe('live/sessions/:sessionId/recording/refresh');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.updateLiveSessionStatus,
      ),
    ).toBe('live/sessions/:sessionId/status');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        LiveController.prototype.remindLiveSession,
      ),
    ).toBe('live/sessions/:sessionId/reminders');
    /* eslint-enable @typescript-eslint/unbound-method */
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
      deleteLiveInput: jest.fn(),
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
        sessionId: expect.any(String) as string,
        shopId: 'shop-1',
        streamProvider: 'CLOUDFLARE_STREAM',
        streamProviderSessionId: 'input-1',
        providerStatus: 'PROVISIONED',
        playbackUrl:
          'https://customer-code.cloudflarestream.com/input-1/iframe',
        streamIngestUrl: null,
        recordingRetentionDays: 30,
      }),
    );
    expect(cloudflareStreamService.createLiveInput).toHaveBeenCalledWith({
      sessionName: 'shop-1: Live hang chinh hang',
      sessionId: expect.any(String) as string,
      shopId: 'shop-1',
    });
    expect(result).toMatchObject({
      id: 'live-1',
      broadcastCredentials: {
        ingestUrl: 'rtmps://live.cloudflare.com:443/live/',
        streamKey: 'secret-stream-key',
      },
    });
  });

  it('marks the provider as starting without setting the commerce session live', async () => {
    const catalogRpcService = {
      getLiveBroadcastContext: jest.fn().mockResolvedValue({
        sessionId: 'live-1',
        shopId: 'shop-1',
        status: 'SCHEDULED',
        streamProvider: 'CLOUDFLARE_STREAM',
        providerSessionId: 'input-1',
      }),
      startLiveSession: jest.fn().mockResolvedValue({
        id: 'live-1',
        shopId: 'shop-1',
        status: 'SCHEDULED',
        providerStatus: 'STARTING',
      }),
    };
    const cloudflareStreamService = {
      getBroadcastCredentials: jest.fn().mockResolvedValue({
        enabled: true,
      }),
    };
    const controller = new LiveController(
      catalogRpcService as never,
      {} as never,
      {} as never,
      { notifyShop: jest.fn() } as never,
      cloudflareStreamService as never,
    );

    await expect(
      controller.startLiveSession('live-1', 'seller-1', {
        role: 'seller',
      } as never),
    ).resolves.toMatchObject({
      status: 'SCHEDULED',
      providerStatus: 'STARTING',
    });
    expect(
      cloudflareStreamService.getBroadcastCredentials,
    ).toHaveBeenCalledWith('input-1');
    expect(catalogRpcService.startLiveSession).toHaveBeenCalledWith({
      sessionId: 'live-1',
      requesterUserId: 'seller-1',
      requesterRole: 'seller',
    });
  });

  it('deletes a provisioned input only after confirming the session was not persisted', async () => {
    const createError = new ServiceUnavailableException('catalog unavailable');
    const catalogRpcService = {
      createLiveSession: jest.fn().mockRejectedValue(createError),
      getLiveBroadcastContext: jest
        .fn()
        .mockRejectedValue(new NotFoundException('Live session not found')),
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
      deleteLiveInput: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new LiveController(
      catalogRpcService as never,
      {} as never,
      {} as never,
      { notifyShop: jest.fn() } as never,
      cloudflareStreamService as never,
    );

    await expect(
      controller.createLiveSession('seller-1', {
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-07-25T02:00:00.000Z',
      }),
    ).rejects.toBe(createError);

    expect(cloudflareStreamService.deleteLiveInput).toHaveBeenCalledWith(
      'input-1',
    );
  });

  it('recovers a successful DB commit after the create RPC response is lost', async () => {
    const catalogRpcService = {
      createLiveSession: jest
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('response lost')),
      getLiveBroadcastContext: jest.fn().mockResolvedValue({
        sessionId: 'live-1',
        shopId: 'shop-1',
        providerSessionId: 'input-1',
        streamProvider: 'CLOUDFLARE_STREAM',
      }),
      getLiveSession: jest.fn().mockResolvedValue({
        id: 'live-1',
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        status: 'SCHEDULED',
      }),
    };
    const cloudflareStreamService = {
      isConfigured: jest.fn().mockReturnValue(true),
      createLiveInput: jest
        .fn()
        .mockImplementation(({ sessionId }: { sessionId: string }) =>
          Promise.resolve({
            providerSessionId: 'input-1',
            playbackUrl:
              'https://customer-code.cloudflarestream.com/input-1/iframe',
            ingestUrl: 'rtmps://live.cloudflare.com:443/live/',
            streamKey: 'secret-stream-key',
            recordingRetentionDays: 30,
            sessionId,
          }),
        ),
      deleteLiveInput: jest.fn(),
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

    expect(result).toMatchObject({
      id: 'live-1',
      broadcastCredentials: {
        ingestUrl: 'rtmps://live.cloudflare.com:443/live/',
        streamKey: 'secret-stream-key',
      },
    });
    expect(cloudflareStreamService.deleteLiveInput).not.toHaveBeenCalled();
  });

  it('keeps the input when the session exists but recovery cannot load it', async () => {
    const createError = new ServiceUnavailableException('response lost');
    const catalogRpcService = {
      createLiveSession: jest.fn().mockRejectedValue(createError),
      getLiveBroadcastContext: jest.fn().mockResolvedValue({
        sessionId: 'live-1',
        shopId: 'shop-1',
        providerSessionId: 'input-1',
        streamProvider: 'CLOUDFLARE_STREAM',
      }),
      getLiveSession: jest
        .fn()
        .mockRejectedValue(new NotFoundException('temporarily unavailable')),
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
      deleteLiveInput: jest.fn(),
    };
    const controller = new LiveController(
      catalogRpcService as never,
      {} as never,
      {} as never,
      { notifyShop: jest.fn() } as never,
      cloudflareStreamService as never,
    );

    await expect(
      controller.createLiveSession('seller-1', {
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-07-25T02:00:00.000Z',
      }),
    ).rejects.toBe(createError);

    expect(cloudflareStreamService.deleteLiveInput).not.toHaveBeenCalled();
  });

  it('does not delete the input while the DB commit state is ambiguous', async () => {
    const createError = new ServiceUnavailableException('catalog unavailable');
    const catalogRpcService = {
      createLiveSession: jest.fn().mockRejectedValue(createError),
      getLiveBroadcastContext: jest
        .fn()
        .mockRejectedValue(
          new ServiceUnavailableException('still unavailable'),
        ),
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
      deleteLiveInput: jest.fn(),
    };
    const controller = new LiveController(
      catalogRpcService as never,
      {} as never,
      {} as never,
      { notifyShop: jest.fn() } as never,
      cloudflareStreamService as never,
    );

    await expect(
      controller.createLiveSession('seller-1', {
        shopId: 'shop-1',
        title: 'Live hang chinh hang',
        startAt: '2026-07-25T02:00:00.000Z',
      }),
    ).rejects.toBe(createError);

    expect(cloudflareStreamService.deleteLiveInput).not.toHaveBeenCalled();
  });

  it.each(['ENDED', 'CANCELLED'] as const)(
    'disables the Cloudflare input when the session becomes %s',
    async (status) => {
      const catalogRpcService = {
        getLiveBroadcastContext: jest.fn().mockResolvedValue({
          sessionId: 'live-1',
          shopId: 'shop-1',
          status: 'LIVE',
          streamProvider: 'CLOUDFLARE_STREAM',
          providerSessionId: 'input-1',
        }),
        updateLiveSessionStatus: jest.fn().mockResolvedValue({
          id: 'live-1',
          shopId: 'shop-1',
          status,
        }),
      };
      const cloudflareStreamService = {
        disableLiveInput: jest.fn().mockResolvedValue(undefined),
      };
      const controller = new LiveController(
        catalogRpcService as never,
        {} as never,
        {} as never,
        { notifyShop: jest.fn() } as never,
        cloudflareStreamService as never,
      );

      await controller.updateLiveSessionStatus(
        'live-1',
        'seller-1',
        { role: 'seller' } as never,
        { status },
      );

      expect(cloudflareStreamService.disableLiveInput).toHaveBeenCalledWith(
        'input-1',
      );
    },
  );

  it('does not return OBS credentials for a terminal session', async () => {
    const catalogRpcService = {
      getLiveBroadcastContext: jest.fn().mockResolvedValue({
        sessionId: 'live-1',
        shopId: 'shop-1',
        status: 'ENDED',
        streamProvider: 'CLOUDFLARE_STREAM',
        providerSessionId: 'input-1',
      }),
    };
    const cloudflareStreamService = {
      getBroadcastCredentials: jest.fn(),
    };
    const controller = new LiveController(
      catalogRpcService as never,
      {} as never,
      {} as never,
      { notifyShop: jest.fn() } as never,
      cloudflareStreamService as never,
    );

    await expect(
      controller.getBroadcastCredentials('live-1', 'seller-1', {
        role: 'seller',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      cloudflareStreamService.getBroadcastCredentials,
    ).not.toHaveBeenCalled();
  });
});
