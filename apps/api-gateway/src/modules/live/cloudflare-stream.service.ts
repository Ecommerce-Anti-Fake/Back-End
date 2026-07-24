import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CloudflareLiveInput = {
  uid: string;
  rtmps: {
    url: string;
    streamKey: string;
  };
};

export type BroadcastCredentials = {
  providerSessionId: string;
  playbackUrl: string;
  ingestUrl: string;
  streamKey: string;
  recordingRetentionDays: number;
};

@Injectable()
export class CloudflareStreamService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.accountId() && this.apiToken() && this.customerCode(),
    );
  }

  async createLiveInput(input: {
    sessionName: string;
  }): Promise<BroadcastCredentials> {
    this.assertConfigured();
    const retentionDays = this.retentionDays();
    const liveInput = await this.requestLiveInput('', {
      method: 'POST',
      body: JSON.stringify({
        meta: { name: input.sessionName },
        deleteRecordingAfterDays: retentionDays,
        recording: {
          mode: 'automatic',
          requireSignedURLs: false,
          allowedOrigins: this.allowedOrigins(),
          hideLiveViewerCount: false,
          timeoutSeconds: 60,
        },
        preferLowLatency: true,
      }),
    });

    return this.toCredentials(liveInput, retentionDays);
  }

  async getBroadcastCredentials(
    providerSessionId: string,
  ): Promise<BroadcastCredentials> {
    this.assertConfigured();
    const liveInput = await this.requestLiveInput(
      `/${encodeURIComponent(providerSessionId)}`,
      { method: 'GET' },
    );
    return this.toCredentials(liveInput, this.retentionDays());
  }

  async disableLiveInput(providerSessionId: string) {
    this.assertConfigured();
    await this.requestLiveInput(`/${encodeURIComponent(providerSessionId)}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled: false }),
    });
  }

  async deleteLiveInput(providerSessionId: string) {
    this.assertConfigured();
    await this.requestLiveInput(`/${encodeURIComponent(providerSessionId)}`, {
      method: 'DELETE',
    });
  }

  async getLatestReadyRecording(providerSessionId: string) {
    this.assertConfigured();
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId()}/stream/live_inputs/${encodeURIComponent(providerSessionId)}/videos`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiToken()}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Livestream recording provider is temporarily unavailable',
      );
    }
    const video = latestReadyVideo(payload);
    if (!video) return null;
    return {
      videoId: video.uid,
      recordingUrl: `https://customer-${this.customerCode()}.cloudflarestream.com/${video.uid}/iframe`,
    };
  }

  private async requestLiveInput(
    suffix: string,
    init: RequestInit,
  ): Promise<CloudflareLiveInput> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId()}/stream/live_inputs${suffix}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiToken()}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Livestream provider is temporarily unavailable',
      );
    }

    const result = liveInputFromResponse(payload);
    if (!result) {
      throw new ServiceUnavailableException(
        'Livestream provider returned an invalid response',
      );
    }
    return result;
  }

  private toCredentials(
    liveInput: CloudflareLiveInput,
    recordingRetentionDays: number,
  ): BroadcastCredentials {
    return {
      providerSessionId: liveInput.uid,
      playbackUrl: `https://customer-${this.customerCode()}.cloudflarestream.com/${liveInput.uid}/iframe`,
      ingestUrl: liveInput.rtmps.url,
      streamKey: liveInput.rtmps.streamKey,
      recordingRetentionDays,
    };
  }

  private allowedOrigins() {
    return (
      this.configService
        .get<string>('CLOUDFLARE_STREAM_ALLOWED_ORIGINS')
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? []
    );
  }

  private retentionDays() {
    const configured = Number(
      this.configService.get<string>('LIVE_RECORDING_RETENTION_DAYS') ?? 30,
    );
    return Number.isInteger(configured) && configured >= 30
      ? configured
      : 30;
  }

  private accountId() {
    return (
      this.configService
        .get<string>('CLOUDFLARE_STREAM_ACCOUNT_ID')
        ?.trim() ?? ''
    );
  }

  private apiToken() {
    return (
      this.configService
        .get<string>('CLOUDFLARE_STREAM_API_TOKEN')
        ?.trim() ?? ''
    );
  }

  private customerCode() {
    return (
      this.configService
        .get<string>('CLOUDFLARE_STREAM_CUSTOMER_CODE')
        ?.trim() ?? ''
    );
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Livestream provider is not configured',
      );
    }
  }
}

function liveInputFromResponse(payload: unknown): CloudflareLiveInput | null {
  if (!payload || typeof payload !== 'object') return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== 'object') return null;
  const record = result as Record<string, unknown>;
  const rtmps = record.rtmps;
  if (!rtmps || typeof rtmps !== 'object') return null;
  const rtmpsRecord = rtmps as Record<string, unknown>;
  if (
    typeof record.uid !== 'string' ||
    typeof rtmpsRecord.url !== 'string' ||
    typeof rtmpsRecord.streamKey !== 'string'
  ) {
    return null;
  }
  return {
    uid: record.uid,
    rtmps: {
      url: rtmpsRecord.url,
      streamKey: rtmpsRecord.streamKey,
    },
  };
}

function latestReadyVideo(payload: unknown): { uid: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const result = (payload as Record<string, unknown>).result;
  if (!Array.isArray(result) || result.length === 0) return null;
  const newest = result[0];
  if (!newest || typeof newest !== 'object') return null;
  const record = newest as Record<string, unknown>;
  const status = record.status;
  if (
    typeof record.uid === 'string' &&
    status &&
    typeof status === 'object' &&
    (status as Record<string, unknown>).state === 'ready'
  ) {
    return { uid: record.uid };
  }
  return null;
}
