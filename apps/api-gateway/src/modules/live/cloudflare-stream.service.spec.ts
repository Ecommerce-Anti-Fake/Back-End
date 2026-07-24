import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { CloudflareStreamService } from './cloudflare-stream.service';

describe('CloudflareStreamService', () => {
  const config = new ConfigService({
    CLOUDFLARE_STREAM_ACCOUNT_ID: 'account-1',
    CLOUDFLARE_STREAM_API_TOKEN: 'api-token',
    CLOUDFLARE_STREAM_CUSTOMER_CODE: 'customer-code',
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
    });

    expect(result).toEqual({
      providerSessionId: 'input-1',
      playbackUrl:
        'https://customer-customer-code.cloudflarestream.com/input-1/iframe',
      ingestUrl: 'rtmps://live.cloudflare.com:443/live/',
      streamKey: 'secret-stream-key',
      recordingRetentionDays: 30,
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account-1/stream/live_inputs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer api-token',
        }),
        body: JSON.stringify({
          meta: { name: 'shop-1: Live hang chinh hang' },
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

  it('fails closed when Cloudflare credentials are incomplete', async () => {
    const service = new CloudflareStreamService(new ConfigService({}));

    await expect(
      service.createLiveInput({ sessionName: 'Live' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
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

    await expect(
      service.getLatestReadyRecording('input-1'),
    ).resolves.toEqual({
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
