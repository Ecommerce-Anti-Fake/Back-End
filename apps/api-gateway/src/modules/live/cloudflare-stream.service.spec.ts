import { ConfigService } from '@nestjs/config';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { CloudflareStreamService } from './cloudflare-stream.service';

describe('CloudflareStreamService', () => {
  const config = new ConfigService({
    CLOUDFLARE_STREAM_ACCOUNT_ID: 'account-1',
    CLOUDFLARE_STREAM_API_TOKEN: 'api-token',
    CLOUDFLARE_STREAM_CUSTOMER_CODE: 'customer-code',
    CLOUDFLARE_STREAM_LIVE_WEBHOOK_SECRET: 'webhook-secret',
    CLOUDFLARE_STREAM_ALLOWED_ORIGINS: 'antifake.io.vn,www.antifake.io.vn',
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('provisions an automatic-recording RTMPS input without persisting secrets', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: {
            uid: 'input-1',
            enabled: true,
            status: null,
            rtmps: {
              url: 'rtmps://live.cloudflare.com:443/live/',
              streamKey: 'secret-stream-key',
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const service = new CloudflareStreamService(config);

    const result = await service.createLiveInput({
      sessionName: 'shop-1: Live hang chinh hang',
      sessionId: 'live-1',
      shopId: 'shop-1',
    });

    expect(result).toEqual({
      providerSessionId: 'input-1',
      playbackUrl:
        'https://customer-customer-code.cloudflarestream.com/input-1/iframe',
      ingestUrl: 'rtmps://live.cloudflare.com:443/live/',
      streamKey: 'secret-stream-key',
      recordingRetentionDays: 30,
      enabled: true,
      providerStatus: null,
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account-1/stream/live_inputs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer api-token',
        }) as HeadersInit,
        body: JSON.stringify({
          enabled: true,
          meta: {
            name: 'shop-1: Live hang chinh hang',
            sessionId: 'live-1',
            shopId: 'shop-1',
          },
          deleteRecordingAfterDays: 30,
          recording: {
            mode: 'automatic',
            requireSignedURLs: false,
            allowedOrigins: ['antifake.io.vn', 'www.antifake.io.vn'],
            hideLiveViewerCount: false,
            timeoutSeconds: 60,
          },
          preferLowLatency: true,
        }),
      }),
    );
  });

  it('fails closed and redacts Cloudflare error details', async () => {
    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          errors: [
            {
              code: 10001,
              message: 'Invalid stream key secret-stream-key',
            },
          ],
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/json',
            'cf-ray': 'test-ray',
          },
        },
      ),
    );
    const service = new CloudflareStreamService(config);

    await expect(
      service.createLiveInput({
        sessionName: 'Live',
        sessionId: 'live-1',
        shopId: 'shop-1',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain('10001');
    expect(logged).toContain('test-ray');
    expect(logged).not.toContain('secret-stream-key');
    expect(logged).not.toContain('api-token');
  });

  it('fails closed when Cloudflare credentials are incomplete', async () => {
    const service = new CloudflareStreamService(new ConfigService({}));

    await expect(
      service.createLiveInput({
        sessionName: 'Live',
        sessionId: 'live-1',
        shopId: 'shop-1',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not return OBS credentials for a disabled input', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: {
            uid: 'input-1',
            enabled: false,
            status: 'failed_to_reconnect',
            rtmps: {
              url: 'rtmps://live.cloudflare.com:443/live/',
              streamKey: 'secret-stream-key',
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const service = new CloudflareStreamService(config);

    await expect(
      service.getBroadcastCredentials('input-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects partially configured Cloudflare mode during startup', () => {
    const service = new CloudflareStreamService(
      new ConfigService({
        CLOUDFLARE_STREAM_ACCOUNT_ID: 'account-1',
        CLOUDFLARE_STREAM_API_TOKEN: 'api-token',
      }),
    );

    expect(() => service.onModuleInit()).toThrow(
      'Cloudflare Stream configuration is incomplete',
    );
  });

  it('requires complete Cloudflare configuration in production', () => {
    const service = new CloudflareStreamService(
      new ConfigService({ NODE_ENV: 'production' }),
    );

    expect(() => service.onModuleInit()).toThrow(
      'Cloudflare Stream configuration is incomplete',
    );
  });

  it('accepts Cloudflare delete responses without a result envelope', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const service = new CloudflareStreamService(config);

    await expect(service.deleteLiveInput('input-1')).resolves.toBeUndefined();
  });

  it('fails when Cloudflare keeps a terminal input enabled', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: {
            uid: 'input-1',
            enabled: true,
            status: null,
            rtmps: {
              url: 'rtmps://live.cloudflare.com:443/live/',
              streamKey: 'secret-stream-key',
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const service = new CloudflareStreamService(config);

    await expect(service.disableLiveInput('input-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('resolves the newest ready recording for a live input', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: [
            { uid: 'ready-video', status: { state: 'ready' } },
            { uid: 'older-video', status: { state: 'ready' } },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const service = new CloudflareStreamService(config);

    await expect(service.getLatestReadyRecording('input-1')).resolves.toEqual({
      videoId: 'ready-video',
      recordingUrl:
        'https://customer-customer-code.cloudflarestream.com/ready-video/iframe',
    });
  });

  it('waits when the newest recording is still processing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: [
            { uid: 'processing-video', status: { state: 'inprogress' } },
            { uid: 'older-ready-video', status: { state: 'ready' } },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const service = new CloudflareStreamService(config);

    await expect(
      service.getLatestReadyRecording('input-1'),
    ).resolves.toBeNull();
  });
});
